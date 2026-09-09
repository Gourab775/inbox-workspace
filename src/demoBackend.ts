/**
 * demoBackend — fully in-browser stand-in for the Python email agents.
 *
 * Used automatically when no backend answers ``/email/health`` (e.g. the
 * static Vercel deployment, which ships no Python runtime). It speaks the
 * exact same SSE protocol as ``agents/email/run.py`` / ``review.py`` so
 * ``App.tsx`` needs zero branching: session → progress/state_update frames
 * → human_review_required pauses → done summaries.
 *
 * Pipeline behavior mirrors the real backend:
 *   - fetch:      serves the built-in mock inbox (or reuses preloaded data
 *                 with ``_cached`` markers, like the real short-circuit)
 *   - classify:   keyword + sender rules → category / needs_reply / priority
 *   - prioritize: VIP +20, urgent ×1.2 (capped at 100), spam → 0,
 *                 ICS +10 when a reply is needed, needs_reply-first filter
 *   - draft:      hand-written per-email drafts, streamed token-by-token
 *   - review:     pauses for the human decision, honors approve / edit /
 *                 reject / regenerate / skip
 *   - summarize:  markdown digest in the same shape as the backend fallback
 *
 * Conversations persist to localStorage (``demo-conv-<id>``) so history
 * restore, the sidebar and refresh-resume all work offline.
 */
import { DEMO_EMAILS } from './demoData';
import type {
  ClassifiedEmail,
  DraftItem,
  Email,
  EmailCategory,
  ReviewDecisionInput,
  RunTask,
  SSEFrame,
  Tone,
} from './types';
import type { ConversationDetail, StoredMessage } from './api';

// ─── Classification rules (mirror the backend heuristics) ─────────────────

const VIP_DOMAINS = ['vipcustomer.com', 'bigclient.com'];

interface ClassHint {
  category: EmailCategory;
  needs_reply: boolean;
  priority: number;
  reason: string;
}

function classifyOne(email: Email): ClassifiedEmail {
  const sender = (email.sender || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const body = (email.body_text || '').toLowerCase();
  const text = `${subject}\n${body}`;
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  let hint: ClassHint;
  if (has('500', 'outage', 'down', 'urgent', 'blocking', 'incident')) {
    hint = {
      category: 'urgent_customer',
      needs_reply: true,
      priority: 95,
      reason: 'Production issue needs an urgent response',
    };
  } else if (email.has_ics || has('invitation', 'invited', 'meeting', 'roadshow', 'rsvp')) {
    hint = {
      category: 'meeting',
      needs_reply: true,
      priority: 80,
      reason: 'Meeting invitation awaiting confirmation',
    };
  } else if (has('won ', 'congratulations', 'lottery', 'prize', 'bank details', 'claim your')) {
    hint = {
      category: 'spam',
      needs_reply: false,
      priority: 5,
      reason: 'Looks like spam — no reply needed',
    };
  } else if (has('invoice', 'billing', 'payment', 'charged')) {
    hint = {
      category: 'billing',
      needs_reply: false,
      priority: 30,
      reason: 'Billing notice, informational',
    };
  } else if (has('quote', 'pricing', 'follow-up', 'follow up', 'proposal')) {
    hint = {
      category: 'followup',
      needs_reply: true,
      priority: 70,
      reason: 'Vendor follow-up that deserves a reply',
    };
  } else if (has('newsletter', 'digest', 'unsubscribe', 'launches')) {
    hint = {
      category: 'marketing',
      needs_reply: false,
      priority: 10,
      reason: 'Marketing content — no reply needed',
    };
  } else if (
    has('2-step', 'two-factor', 'password', 'verification', 'confirmation', 'reminder')
  ) {
    hint = {
      category: 'notification',
      needs_reply: false,
      priority: 20,
      reason: 'System notification, informational',
    };
  } else if (has('taking', 'leave', 'time off', 'pto', 'vacation')) {
    hint = {
      category: 'internal',
      needs_reply: true,
      priority: 60,
      reason: 'Time-off request needs a decision',
    };
  } else if (sender.endsWith('@company.com') || has('planning', 'review', 'headcount')) {
    hint = {
      category: 'internal',
      needs_reply: false,
      priority: 45,
      reason: 'Internal update, FYI only',
    };
  } else {
    hint = {
      category: 'other',
      needs_reply: false,
      priority: 35,
      reason: 'No clear action required',
    };
  }
  return { email, ...hint };
}

// ─── Prioritization (mirror _nodes.prioritize) ─────────────────────────────

const MIN_PRIORITY = 30;

function boost(entry: ClassifiedEmail): ClassifiedEmail {
  let priority = entry.priority;
  const domain = (entry.email.sender || '').split('@')[1]?.toLowerCase() || '';
  if (VIP_DOMAINS.includes(domain)) priority = Math.min(100, priority + 20);
  if (entry.category === 'urgent_customer') {
    priority = Math.min(100, Math.floor(priority * 1.2));
  }
  if (entry.category === 'spam') priority = 0;
  if (entry.email.has_ics && entry.needs_reply) {
    priority = Math.min(100, priority + 10);
  }
  return { ...entry, priority };
}

function prioritizeAll(
  classified: ClassifiedEmail[],
  opts: { task: RunTask; targetEmailId?: string; skipEmailIds?: string[] },
): { prioritized: ClassifiedEmail[]; error?: string } {
  const boosted = classified.map(boost);
  if (opts.task === 'single_reply' && opts.targetEmailId) {
    const target = boosted.find((c) => c.email.id === opts.targetEmailId);
    if (!target) {
      return {
        prioritized: [],
        error:
          `Email ${opts.targetEmailId} is not in the current inbox — ` +
          `the cache may be stale, try 'Force Refresh' above`,
      };
    }
    return { prioritized: [target] };
  }
  const skip = new Set(opts.task === 'daily_digest' ? opts.skipEmailIds ?? [] : []);
  const keep = boosted.filter(
    (c) =>
      !skip.has(c.email.id) && (c.needs_reply || c.priority >= MIN_PRIORITY),
  );
  keep.sort(
    (a, b) =>
      b.priority - a.priority ||
      +new Date(a.email.received_at) - +new Date(b.email.received_at),
  );
  return { prioritized: keep };
}

// ─── Drafts (hand-written, one per reply-worthy email) ─────────────────────

interface DraftSpec {
  to: string[];
  subject: string;
  body: string;
  bodyV2: string;
  tone: Tone;
  confidence: number;
  rationale: string;
}

const DRAFTS: Record<string, DraftSpec> = {
  m1: {
    to: ['ceo@vipcustomer.com'],
    subject: 'Re: Production 500 — checkout API down',
    body:
      'Hi Sarah,\n\nThank you for flagging this — I understand how critical the checkout API is right now, and we are treating it as our top priority.\n\nHere is what is happening:\n\n- Our on-call engineer is investigating the 500s as we speak.\n- I will personally send you an update every 30 minutes until this is fully resolved.\n- If you need an immediate workaround, retrying with idempotency keys enabled should let queued orders through safely.\n\nI will follow up shortly with a first ETA. Sorry for the disruption — we will get this fixed.\n\nBest regards,\nMike',
    bodyV2:
      'Hi Sarah,\n\nAcknowledged — the checkout 500s are our P0 right now and the on-call team is already investigating.\n\nWhat you can expect from us:\n\n- An ETA within the next 30 minutes, then updates every 30 minutes.\n- A post-incident report once service is fully restored.\n- As a temporary workaround, orders retried with idempotency keys should process normally.\n\nThank you for your patience. I will be back shortly with the ETA.\n\nBest regards,\nMike',
    tone: 'urgent',
    confidence: 0.92,
    rationale:
      'Acknowledges the outage immediately, commits to 30-minute updates (as requested), offers a safe workaround, and promises an ETA without inventing one.',
  },
  m2: {
    to: ['events@bigclient.com'],
    subject: 'Re: Invitation: Q3 Product Roadshow in Berlin',
    body:
      'Hi Elena,\n\nThank you for the invitation — we would love to join the Q3 Product Roadshow in Berlin on June 12.\n\nPlease reserve the 20-minute integration-roadmap slot for our team. I will confirm the speaker name by end of week. I have also saved the attached calendar invite.\n\nLooking forward to it!\n\nBest regards,\nMike',
    bodyV2:
      'Hi Elena,\n\nDelighted to accept — please count us in for the Berlin roadshow on June 12, including the 20-minute slot on the integration roadmap.\n\nTwo quick questions: is there a preferred session format (talk vs. live demo), and when do you need final slide decks? I will lock in our speaker this week.\n\nThanks again for thinking of us!\n\nBest regards,\nMike',
    tone: 'friendly_professional',
    confidence: 0.88,
    rationale:
      'Accepts promptly, confirms the requested slot and the .ics invite, and commits to a speaker deadline — warm but concrete.',
  },
  m6: {
    to: ['sales@vendor.com'],
    subject: "Re: Re: Follow-up on last month's quote",
    body:
      'Hi Frank,\n\nThanks for following up — and for the flexibility on pricing.\n\nThe SSO integration and SLA upgrade are indeed our two must-haves, so the 20% discount there helps. Before we move forward, could you share an updated quote reflecting it?\n\nI am free for a 30-minute call Thursday or Friday morning to finalize scope. Let me know what works on your side.\n\nBest regards,\nMike',
    bodyV2:
      'Hi Frank,\n\nAppreciate the follow-up and the movement on price — the SSO and SLA discount addresses our main concern.\n\nNext step from our side: an updated written quote with the 20% applied, plus confirmation that implementation support is included. If that checks out, I can get internal sign-off quickly.\n\nI am available Thursday or Friday morning for a 30-minute call to close this out.\n\nBest regards,\nMike',
    tone: 'friendly_professional',
    confidence: 0.84,
    rationale:
      'Keeps leverage (asks for the discount in writing), names the must-haves explicitly, and moves toward a concrete call — polite but firm.',
  },
  m9: {
    to: ['lily@company.com'],
    subject: 'Re: Taking Thursday off',
    body:
      'Hi Lily,\n\nApproved — take Thursday off, family comes first. Hope everything goes well at the check-up.\n\nThanks for arranging cover so thoroughly: Alex on the standup, the canary moved to Friday with SRE in the loop, and client follow-ups done Wednesday. Nothing further needed from you.\n\nPing me only if something truly urgent comes up — otherwise see you Friday.\n\nBest,\nMike',
    bodyV2:
      'Hi Lily,\n\nOf course — Thursday is approved. I hope the appointment goes smoothly.\n\nYour handover plan looks solid (Alex hosting standup, canary postponed with SRE aligned, follow-ups finished Wednesday), so rest easy. I will only reach out if something is genuinely on fire.\n\nTake care,\nMike',
    tone: 'friendly_professional',
    confidence: 0.9,
    rationale:
      'Approves clearly and warmly, mirrors back the handover plan so Lily knows it was read, and removes any pressure to stay reachable.',
  },
};

function fallbackDraft(email: Email): DraftItem {
  return {
    email_id: email.id,
    to: [email.sender || ''],
    subject: email.subject ? `Re: ${email.subject}` : 'Re: (no subject)',
    body:
      `Hi,\n\nThanks for your email about "${email.subject || 'your message'}". ` +
      `I have reviewed it and will get back to you with more details shortly.\n\nBest regards,\nMike`,
    tone: 'friendly_professional',
    template_used: 'generic-ack',
    confidence: 0.62,
    rationale: 'Generic acknowledgement — no specialized template matched this email.',
  };
}

function buildDraft(email: Email, attempt: number, feedback?: string): DraftItem {
  const spec = DRAFTS[email.id];
  if (!spec) return fallbackDraft(email);
  const firstPass = attempt <= 1;
  let body = firstPass ? spec.body : spec.bodyV2;
  let rationale = spec.rationale;
  if (!firstPass && feedback?.trim()) {
    rationale += ` Rewritten to address your feedback: "${feedback.trim()}".`;
  }
  return {
    email_id: email.id,
    to: spec.to,
    subject: spec.subject,
    body,
    tone: spec.tone,
    template_used: `demo-${email.id}-v${firstPass ? 1 : 2}`,
    confidence: firstPass ? spec.confidence : Math.max(0.5, spec.confidence - 0.05),
    rationale,
  };
}

// ─── Summary (same shape as the backend fallback digest) ───────────────────

function buildSummary(args: {
  inbox: number;
  classified: number;
  drafts: number;
  decisions: { email_id: string; action: string }[];
  actions: number;
  top: ClassifiedEmail[];
}): string {
  const lines = [
    '## Overview',
    `- Inbox total: ${args.inbox}`,
    `- Classified: ${args.classified}`,
    `- Drafts generated: ${args.drafts}`,
    `- Decisions: ${args.decisions.length}`,
    `- Actions executed: ${args.actions}`,
  ];
  if (args.top.length > 0) {
    lines.push('', '## Needs Attention');
    for (const t of args.top.slice(0, 5)) {
      lines.push(`- [${t.priority}] ${t.email.subject} — ${t.email.sender}`);
    }
  }
  if (args.decisions.length > 0) {
    lines.push('', '## Decisions');
    for (const d of args.decisions) {
      lines.push(`- ${d.email_id}: **${d.action}**`);
    }
  }
  return lines.join('\n');
}

// ─── Snapshot persistence (history restore works offline) ──────────────────

interface DemoSession {
  classified: ClassifiedEmail[];
  prioritized: ClassifiedEmail[];
  queue: string[];
  cursor: number;
  drafts: DraftItem[];
  decisions: { email_id: string; action: string }[];
  pendingReview: DraftItem | null;
  messages: StoredMessage[];
  updatedAt: number;
}

const SNAP_PREFIX = 'demo-conv-';
const sessions = new Map<string, DemoSession>();

function snapKey(id: string): string {
  return `${SNAP_PREFIX}${id}`;
}

let msgSeq = 0;

function pushMessage(
  session: DemoSession,
  role: string,
  content: string,
  metadata?: Record<string, unknown>,
): void {
  msgSeq += 1;
  session.messages.push({
    message_id: `demo-m${Date.now().toString(36)}-${msgSeq}`,
    role,
    content,
    createdAt: Date.now(),
    metadata,
  });
}

function persist(id: string, session: DemoSession): void {
  session.updatedAt = Date.now();
  sessions.set(id, session);
  try {
    window.localStorage.setItem(snapKey(id), JSON.stringify(session));
  } catch {
    /* storage unavailable — in-memory session still works for this tab */
  }
}

function loadSession(id: string): DemoSession | null {
  const live = sessions.get(id);
  if (live) return live;
  try {
    const raw = window.localStorage.getItem(snapKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    sessions.set(id, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function freshSession(): DemoSession {
  return {
    classified: [],
    prioritized: [],
    queue: [],
    cursor: 0,
    drafts: [],
    decisions: [],
    pendingReview: null,
    messages: [],
    updatedAt: Date.now(),
  };
}

const TASK_LABELS: Record<RunTask, string> = {
  triage_only: 'Classify emails only',
  daily_digest: 'Process emails needing replies',
  single_reply: 'Process a single email',
};

function decisionEchoText(d: ReviewDecisionInput): string {
  switch (d.action) {
    case 'approve':
      return '✓ Approve';
    case 'edit':
      return d.edited_body ? '✏️ Use my edit' : '✓ Approve (edited)';
    case 'reject':
      return '✗ No reply';
    case 'regenerate':
      return d.feedback ? `↻ Rewrite: ${d.feedback}` : '↻ Rewrite';
    case 'skip':
      return '↦ Skip';
  }
}

// ─── Abort-aware sleep ─────────────────────────────────────────────────────

function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function chunkText(text: string, parts: number): string[] {
  const chunks: string[] = [];
  const step = Math.max(1, Math.ceil(text.length / parts));
  for (let i = 0; i < text.length; i += step) {
    chunks.push(text.slice(i, i + step));
  }
  return chunks;
}

// ─── Public engine ─────────────────────────────────────────────────────────

export interface DemoRunOptions {
  task: RunTask;
  conversationId: string;
  signal?: AbortSignal;
  preloadedClassified?: unknown[];
  targetEmailId?: string;
  skipEmailIds?: string[];
  forceRefresh?: boolean;
}

function validPreloaded(input: unknown): ClassifiedEmail[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: ClassifiedEmail[] = [];
  for (const item of input) {
    if (
      item &&
      typeof item === 'object' &&
      (item as ClassifiedEmail).email &&
      typeof (item as ClassifiedEmail).email.id === 'string'
    ) {
      out.push(item as ClassifiedEmail);
    }
  }
  return out.length > 0 ? out : null;
}

export async function* runDemo(opts: DemoRunOptions): AsyncGenerator<SSEFrame> {
  const { task, conversationId: cid, signal } = opts;
  const cached = !opts.forceRefresh ? validPreloaded(opts.preloadedClassified) : null;

  const session = loadSession(cid) ?? freshSession();
  session.queue = [];
  session.pendingReview = null;

  yield { event: 'session', data: { type: 'session', conversationId: cid, task } };
  pushMessage(session, 'user', `[task] ${TASK_LABELS[task]}`, {
    task,
    kind: 'task_start',
  });
  persist(cid, session);

  // ── fetch ──
  yield progress('fetch', 'started', `📥 Fetching latest emails from the mailbox…`);
  await sleep(700, signal);
  checkAborted(signal);
  if (cached) {
    session.classified = cached;
    yield {
      event: 'state_update',
      data: {
        fetch: { inbox: cached.map((c) => c.email), _cached: true },
      },
    };
    yield progress('fetch', 'completed', `⚡ Reusing ${cached.length} cached emails (fetch skipped)`);
  } else {
    session.classified = [];
    yield progress('fetch', 'started', `📥 Fetching latest emails from the mailbox…`);
    await sleep(300, signal);
    checkAborted(signal);
    yield {
      event: 'state_update',
      data: { fetch: { inbox: DEMO_EMAILS } },
    };
    yield progress('fetch', 'completed', `📥 Fetched · ${DEMO_EMAILS.length} emails to classify`);
  }

  // ── classify ──
  yield progress('classify', 'started', `🧠 LLM classifying ${session.classified.length || DEMO_EMAILS.length} emails… (single batch call)`);
  await sleep(1100, signal);
  checkAborted(signal);
  if (cached) {
    yield { event: 'state_update', data: { classify: { _cached: true } } };
    yield progress('classify', 'completed', '⚡ Reusing cached classification (LLM skipped)');
  } else {
    session.classified = DEMO_EMAILS.map(classifyOne);
    yield {
      event: 'state_update',
      data: { classify: { classified: session.classified } },
    };
    yield progress(
      'classify',
      'completed',
      `✅ Classified · ${session.classified.length} emails labeled`,
    );
  }

  // ── prioritize ──
  yield progress('prioritize', 'started', '📊 Applying rules and sorting…');
  await sleep(600, signal);
  checkAborted(signal);
  const { prioritized, error } = prioritizeAll(session.classified, {
    task,
    targetEmailId: opts.targetEmailId,
    skipEmailIds: opts.skipEmailIds,
  });
  session.prioritized = prioritized;
  const patch: Record<string, unknown> = { prioritized };
  if (error) patch.errors = [error];
  yield { event: 'state_update', data: { prioritize: patch } };
  yield progress(
    'prioritize',
    'completed',
    prioritized.length > 0
      ? `📊 Sorted · ${prioritized.length} to process`
      : '📊 Sorted · nothing needs a reply',
  );

  if (task === 'triage_only') {
    const summary = buildSummary({
      inbox: session.classified.length,
      classified: session.classified.length,
      drafts: 0,
      decisions: session.decisions,
      actions: 0,
      top: prioritized,
    });
    yield* streamSummary(cid, session, summary, signal);
    return;
  }

  if (prioritized.length === 0) {
    const summary = buildSummary({
      inbox: session.classified.length,
      classified: session.classified.length,
      drafts: session.drafts.length,
      decisions: session.decisions,
      actions: session.decisions.length,
      top: [],
    });
    yield* streamSummary(cid, session, summary, signal);
    return;
  }

  // ── draft loop (first email pauses here; rest continue via reviewDemo) ──
  session.queue = prioritized.map((c) => c.email.id);
  session.cursor = 0;
  persist(cid, session);
  const first = prioritized[0];
  yield* draftOne(cid, session, first, 1, undefined, signal);
}

async function* draftOne(
  cid: string,
  session: DemoSession,
  item: ClassifiedEmail,
  attempt: number,
  feedback: string | undefined,
  signal?: AbortSignal,
): AsyncGenerator<SSEFrame> {
  const email = item.email;
  yield progress(
    'draft',
    'started',
    `🤖 Crew starting a reply draft for '${email.subject || '(no subject)'}'${feedback ? ' · your feedback applied' : ''}`,
    email.id,
  );
  await sleep(500, signal);
  checkAborted(signal);
  const draft = buildDraft(email, attempt, feedback);
  for (const delta of chunkText(draft.body, 5)) {
    yield {
      event: 'progress',
      data: { phase: 'draft', stage: 'token', delta, email_id: email.id },
    };
    await sleep(110, signal);
  }
  checkAborted(signal);
  yield { event: 'state_update', data: { draft: { pending_review: draft } } };
  yield progress('draft', 'completed', `✅ Draft ready · ${draft.body.length} chars · awaiting your review`, email.id);

  session.pendingReview = draft;
  const remaining = Math.max(0, session.queue.length - session.cursor - 1);
  pushMessage(session, 'assistant', `For manual review: ${draft.subject}`, {
    kind: 'draft_for_review',
    email_id: draft.email_id,
  });
  persist(cid, session);
  yield {
    event: 'human_review_required',
    data: {
      type: 'human_review_required',
      draft,
      options: ['approve', 'edit', 'reject', 'regenerate', 'skip'],
      remaining,
      email_id: draft.email_id,
    },
  };
  yield { event: 'paused', data: '[PAUSED]' };
}

export interface DemoReviewOptions {
  conversationId: string;
  decision: ReviewDecisionInput;
  signal?: AbortSignal;
}

export async function* reviewDemo(opts: DemoReviewOptions): AsyncGenerator<SSEFrame> {
  const { conversationId: cid, decision, signal } = opts;
  const session = loadSession(cid);
  if (!session?.pendingReview) {
    yield { event: 'error_message', data: { error: 'No draft is awaiting review.' } };
    return;
  }
  const draft = session.pendingReview;
  yield { event: 'session', data: { type: 'session', conversationId: cid, resumed: true } };
  pushMessage(session, 'user', decisionEchoText(decision), { kind: 'decision' });

  if (decision.action === 'regenerate') {
    await sleep(400, signal);
    checkAborted(signal);
    const item = session.prioritized.find((c) => c.email.id === draft.email_id);
    if (item) {
      yield* draftOne(cid, session, item, 2, decision.feedback, signal);
    }
    return;
  }

  // finalize this email
  session.decisions.push({ email_id: draft.email_id, action: decision.action });
  if (decision.action === 'edit' && decision.edited_body) {
    const idx = session.drafts.findIndex((d) => d.email_id === draft.email_id);
    const updated = { ...draft, body: decision.edited_body };
    if (idx >= 0) session.drafts[idx] = updated;
    else session.drafts.push(updated);
  } else if (decision.action === 'approve') {
    if (!session.drafts.some((d) => d.email_id === draft.email_id)) {
      session.drafts.push(draft);
    }
  }
  session.cursor += 1;
  session.pendingReview = null;
  yield {
    event: 'state_update',
    data: {
      review: { review_decisions: session.decisions },
      apply: {
        cursor: session.cursor,
        drafts: session.drafts,
        review_decisions: session.decisions,
      },
    },
  };
  persist(cid, session);
  await sleep(350, signal);
  checkAborted(signal);

  const nextId = session.queue[session.cursor];
  const next = session.prioritized.find((c) => c.email.id === nextId);
  if (next) {
    yield* draftOne(cid, session, next, 1, undefined, signal);
    return;
  }
  const summary = buildSummary({
    inbox: session.classified.length,
    classified: session.classified.length,
    drafts: session.drafts.length,
    decisions: session.decisions,
    actions: session.decisions.filter((d) => d.action !== 'skip').length,
    top: session.prioritized,
  });
  yield* streamSummary(cid, session, summary, signal);
}

async function* streamSummary(
  cid: string,
  session: DemoSession,
  summary: string,
  signal?: AbortSignal,
): AsyncGenerator<SSEFrame> {
  yield progress('summarize', 'started', `📝 LLM generating the digest… (based on ${session.decisions.length} decisions)`);
  await sleep(800, signal);
  checkAborted(signal);
  for (const delta of chunkText(summary, 3)) {
    yield { event: 'progress', data: { phase: 'summarize', stage: 'token', delta } };
    await sleep(140, signal);
  }
  checkAborted(signal);
  yield { event: 'state_update', data: { summarize: { summary } } };
  yield progress('summarize', 'completed', `✅ Digest ready · ${summary.length} chars`);
  session.pendingReview = null;
  pushMessage(session, 'assistant', summary, { kind: 'summary' });
  persist(cid, session);
  yield { event: 'done', data: { summary } };
  yield { event: 'end', data: '[DONE]' };
}

function progress(
  phase: 'fetch' | 'classify' | 'prioritize' | 'draft' | 'review' | 'apply' | 'summarize',
  stage: 'started' | 'completed',
  message: string,
  email_id?: string,
): SSEFrame {
  const data: Record<string, unknown> = { phase, stage, message };
  if (email_id) data.email_id = email_id;
  return { event: 'progress', data };
}

// ─── Demo history (offline list / get / delete) ────────────────────────────

export interface DemoConversationItem {
  id: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
}

export function listDemoConversations(): DemoConversationItem[] {
  // Union of in-memory sessions (current tab, always fresh) and persisted
  // snapshots (previous visits). Memory wins on conflict.
  const ids = new Set<string>(sessions.keys());
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(SNAP_PREFIX)) ids.add(key.slice(SNAP_PREFIX.length));
    }
  } catch {
    /* storage unavailable — memory only */
  }
  const items: DemoConversationItem[] = [];
  for (const id of ids) {
    const session = loadSession(id);
    if (!session) continue;
    const firstUser = session.messages.find((m) => m.role === 'user');
    const text = typeof firstUser?.content === 'string' ? firstUser.content : '(untitled)';
    items.push({
      id,
      title: text.slice(0, 60),
      createdAt: session.messages[0]?.createdAt ?? session.updatedAt,
      lastMessageAt: session.updatedAt,
      messageCount: session.messages.length,
    });
  }
  return items.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export function getDemoConversation(id: string): ConversationDetail | null {
  const session = loadSession(id);
  if (!session) return null;
  return {
    id,
    messages: session.messages,
    state: {
      classified: session.classified,
      prioritized: session.prioritized,
      drafts: session.drafts,
      review_decisions: session.decisions,
      pending_review: session.pendingReview,
      cursor: session.cursor,
    },
    nextNodes: session.pendingReview ? ['review'] : [],
  };
}

export function deleteDemoConversation(id: string): boolean {
  sessions.delete(id);
  try {
    window.localStorage.removeItem(snapKey(id));
  } catch {
    /* noop */
  }
  return true;
}
