/**
 * i18n — English-only strings.
 *
 * The UI ships in English only: a single flat translation table, no
 * language toggle. The provider API (locale / t / toggleLocale) is kept
 * so existing components don't need changes — locale is always 'en'
 * and toggleLocale is a no-op.
 */
import { createContext, useContext, useCallback, type ReactNode } from 'react';

export type Locale = 'en';

const translations = {
  // Header
  appTitle: 'AI Email Assistant',
  appSubtitle: 'LangGraph · CrewAI · Human-in-the-loop',

  // Toolbar
  fetchEmails: 'Fetch Emails',
  aiSmartProcess: 'AI Smart Process',
  stop: 'Stop',
  newSession: 'New Session',
  history: 'History',

  // AI confirm modal
  aiConfirmTitle: 'AI Smart Process',
  aiConfirmBody: 'AI will pick the emails that need replies, draft responses one by one, and wait for your approval. You can stop at any time.',
  aiConfirmCancel: 'Cancel',
  aiConfirmStart: 'Start',

  // Onboarding
  onboardingTitle: 'Email Assistant',
  onboardingDesc: 'AI classifies your emails, drafts replies — you make the call',
  step1Title: 'Fetch Emails',
  step1Body: 'Click "Fetch Emails" in the toolbar above',
  step2Title: 'Pick & Process',
  step2Body: 'Click "Draft Reply" on any email in the left panel',
  step3Title: 'Review & Approve',
  step3Body: 'Approve / Edit / Reject — you have the final say',
  dataSourceLabel: 'Data Source',
  providerMock: 'Mock Data',
  providerImap: 'IMAP Mailbox',
  providerGmail: 'Gmail',
  providerConnected: 'Connected to {provider}. Will fetch from your real inbox.',
  providerMockDesc: 'Using mock data (10 sample emails). Configure IMAP in environment variables to connect a real mailbox. See README.',
  providerMockBadge: '⚡ Mock Data Mode',
  providerLiveBadge: '✓ Connected to {provider}',
  aiHint: 'Not sure which emails to handle? Click "AI Smart Process" and let AI pick for you',
  ctaHint: '↑ Click the corresponding button in the toolbar above. After processing, click emails in the left panel for details.',

  // Inbox
  inboxTitle: 'Inbox',
  inboxHint: 'Click an email for details, hover for "Process" button',
  inboxEmpty: 'Waiting for emails',
  inboxEmptyHint: 'Click "Fetch Emails" to start',
  inboxFetching: 'Fetching emails...',
  inboxClassifying: 'Fetched {count} emails, classifying...',
  processBtn: 'Process',
  processBtnTitle: 'Process this email individually',
  statusAll: 'All',
  statusPending: 'Pending',
  statusDone: 'Done',
  allCategories: 'All',
  doneLabel: 'Done',
  activeLabel: 'Reviewing',

  // Email categories
  catUrgentCustomer: 'Urgent',
  catMeeting: 'Meeting',
  catInternal: 'Internal',
  catMarketing: 'Marketing',
  catNotification: 'Notification',
  catFollowup: 'Follow-up',
  catSpam: 'Spam',
  catBilling: 'Billing',
  catOther: 'Other',

  // Pipeline
  pipelineTitle: 'Pipeline',

  // History sidebar
  historyTitle: 'History',
  historyEmpty: 'No history',
  historyEmptyHint: 'Sessions will appear here after you process emails',
  historyRestore: 'Refresh',
  historyRestoring: 'Refreshing...',
  historyDeletedRemote: 'This session was deleted on another device',

  // Status chip
  statusRunning: 'Running',
  statusPaused: 'Awaiting Review',
  statusIdle: 'Ready',

  // Pipeline nodes
  pipelineFetch: 'Fetch Emails',
  pipelineClassify: 'Classify',
  pipelinePrioritize: 'Prioritize',
  pipelineDraft: 'Draft',
  pipelineReview: 'Review',
  pipelineApply: 'Apply',
  pipelineSummarize: 'Summarize',
  pipelineFetchDesc: 'Fetch latest emails',
  pipelineClassifyDesc: 'LLM batch classification',
  pipelinePrioritizeDesc: 'Priority scoring',
  pipelineDraftDesc: 'CrewAI three-role drafting',
  pipelineReviewDesc: 'Human approval',
  pipelineApplyDesc: 'Save draft / mark',
  pipelineSummarizeDesc: 'Generate summary',

  // Draft review card
  reviewApprove: 'Approve',
  reviewRegenerate: 'Rewrite',
  reviewSkip: 'Skip',
  reviewReject: 'Reject',
  reviewEditApprove: 'Use my edit',
  reviewFeedbackPlaceholder: '(Optional) Feedback for rewrite, e.g. "more formal tone"',
  reviewPendingLabel: 'Draft for Review',
  reviewRationale: 'Why this reply?',

  // Message bubble kinds
  kindSystem: 'System',
  kindPipeline: 'Pipeline',
  kindReview: 'Review',
  kindDecision: 'Me',
  kindSummary: 'Summary',
  kindError: 'Error',
  kindSession: 'Session',

  // Misc
  loading: 'Loading session...',

  // Session / task labels (timeline "Session" bubbles)
  sessionStarted: 'Session started',
  taskLabelTriage: 'Classify emails only',
  taskLabelDaily: 'Process emails needing replies',
  taskLabelSingle: 'Process a single email',

  // One-shot task summaries emitted on first prioritize result
  classifyDoneTriage: '📥 Classified {count} emails — triage-only mode drafts no replies; see the left panel for details',
  singleReplyHit: '🎯 Processing this 1 email — drafting now',
  singleReplyMiss: '🎯 This email is not in the cache — try "Force Refresh" above',
  digestHasDrafts: '📥 Received {total} emails, {need} need replies — you will review each draft',
  digestNoDrafts: '📥 Received {count} emails, none need a drafted reply',

  // HITL review prompt
  reviewPrompt: 'For manual review: {subject}',
  draftNoSubjectHint: '(draft has no subject — the LLM usually misses it; the backend falls back to Re:)',

  // Streaming bubble eyebrows
  streamingSummary: 'Writing digest…',
  streamingDraft: 'Drafting reply…',

  // Run lifecycle
  cancelled: 'Cancelled',
  stopped: '⏹ Stopped',
  backendError: 'Backend error',
  checkpointWarning: '⚠ The backend asked to re-review the same email ({id}).\nThis usually means the LangGraph checkpointer did not persist (local dev defaults to in-memory)\nand each request starts from a fresh process.',
  restoredToReview: '↩ Restored to the paused review — continue with this email',
  loadSessionFailed: 'Failed to load session: {msg}',

  // Decision echo labels (timeline bubbles for user decisions)
  decApprove: '✓ Approve',
  decApproveEdited: '✓ Approve (edited)',
  decEdit: '✏️ Use my edit',
  decReject: '✗ No reply',
  decRegenerate: '↻ Rewrite',
  decRegenerateWith: '↻ Rewrite: {feedback}',
  decSkip: '↦ Skip',

  // Runtime status chip (header)
  chipAwaiting: 'Awaiting Review',
  chipAwaitingCount: 'Awaiting Review · {i} / {t}',
  chipRunning: 'Running',
  chipRunningCount: 'Running · {i} / {t}',
  chipDone: 'Done',
  chipDoneCount: 'Done · {i} / {t}',

  // DraftReviewCard
  noSubjectDraft: '(no subject)',
  draftToLabel: 'To:',
  draftToneLabel: 'Tone:',
  draftRemainingPrefix: ' · ',
  draftRemainingSuffix: ' more in queue',
  draftConfidenceTitle: "The model's confidence in this draft",

  // EmailDetailDrawer
  drawerAriaLabel: 'Email details',
  drawerCloseTitle: 'Close (Esc)',
  drawerCopyDraft: 'Copy draft',
  drawerUnknownSender: '(unknown sender)',
  drawerMetaTitle: 'Email Info',
  drawerFrom: 'From',
  drawerTo: 'To',
  drawerSubject: 'Subject',
  drawerTime: 'Time',
  drawerAttachment: 'Attachment',
  drawerIcs: 'Calendar invite (.ics)',
  drawerClassTitle: 'AI Classification',
  drawerPriority: 'Priority {n}',
  drawerNeedsReply: 'Needs reply',
  drawerOriginalTitle: 'Original Email',
  drawerPlainText: 'Plain text',
  drawerEmptyBody: '(empty body)',
  drawerDraftTitle: 'Draft',
  drawerNoDraft: 'No draft generated yet',
  drawerCopy: 'Copy',
  drawerCopyTitle: 'Copy to clipboard',
  drawerCopied: 'Copied',

  // EmailInboxTree
  filterToggleTitle: 'Show/hide filters',
  searchPlaceholder: 'Search subject/sender...',
  clearSearchTitle: 'Clear search',
  filterResult: 'Showing {shown} / {total}',
  refreshBannerTitle: 'A new task is re-fetching and classifying emails; this panel refreshes when done',
  refreshBannerText: 'Re-fetching...',
  needsReplyTitle: 'Needs reply',
  noReplyNeededTitle: 'No reply needed',

  // NodeFlowVisualizer
  cachedPillTitle: 'Reused the previous result — no real mailbox / LLM access',
  cachedPillLabel: 'cached',
  nodeActive: 'Active',
  nodePaused: 'Paused',
  nodeDone: 'Done',
  nodeError: 'Error',

  // HistorySidebar
  historyCurrentSession: 'Current session',
  historySwitchTo: 'Switch to this session',
  historyDeleteTitle: 'Delete this session',
  historyDeleteAria: 'Delete {title}',
  historyUntitled: '(untitled)',
  relJustNow: 'just now',
  relMinutesAgo: '{n} min ago',
  relHoursAgo: '{n} h ago',
  relDaysAgo: '{n} d ago',

  // ChatLayout
  resizeHandleTitle: 'Drag to resize',
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Kept for API compatibility — no-op, the UI is English-only. */
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: (key) => translations[key],
  toggleLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>): string => {
    let text: string = translations[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }, []);

  return (
    <I18nContext.Provider value={{ locale: 'en', t, toggleLocale: () => {} }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
