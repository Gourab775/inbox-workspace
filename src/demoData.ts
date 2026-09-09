/**
 * demoData — built-in English mock inbox for demo (no-backend) mode.
 *
 * Mirrors ``agents/email/fixtures/inbox/*.eml`` (same senders, subjects and
 * shape) so the demo pipeline classifies, prioritizes and drafts against
 * realistic data without any network or LLM access.
 */
import type { Email } from './types';

const NOW = Date.now();
const HOUR = 3_600_000;

function hoursAgo(h: number): string {
  return new Date(NOW - h * HOUR).toISOString();
}

export const DEMO_EMAILS: Email[] = [
  {
    id: 'm1',
    sender: 'ceo@vipcustomer.com',
    to: ['mike@example.com'],
    subject: 'Production 500 — checkout API down',
    body_text:
      'Hi Mike,\n\nOur checkout API started returning 500s about 20 minutes ago ' +
      'and orders are failing. This is blocking all of our Black Friday prep traffic.\n\n' +
      'Can someone look at this urgently and give us an ETA? We need updates ' +
      'every 30 minutes until it is resolved.\n\nThanks,\nSarah (VIP Customer)',
    received_at: hoursAgo(1),
    thread_id: 'thr_outage_500',
  },
  {
    id: 'm2',
    sender: 'events@bigclient.com',
    to: ['mike@example.com'],
    subject: 'Invitation: Q3 Product Roadshow in Berlin',
    body_text:
      'Hello Mike,\n\nYou are invited to our Q3 Product Roadshow in Berlin on ' +
      'June 12. We would love a 20-minute slot from your team on the integration roadmap.\n\n' +
      'Please confirm your attendance — a calendar invite (.ics) is attached.\n\nBest,\nElena, Events Team',
    received_at: hoursAgo(3),
    thread_id: 'thr_roadshow_berlin',
    has_ics: true,
  },
  {
    id: 'm3',
    sender: 'manager@company.com',
    to: ['mike@example.com'],
    subject: 'Q3 planning doc — please review by Friday',
    body_text:
      'Hi Mike,\n\nThe Q3 planning doc is ready for review. No rush — Friday ' +
      'is fine. Main open questions are headcount for the mobile track and ' +
      'the analytics migration timeline.\n\nThanks!\nPriya',
    received_at: hoursAgo(5),
    thread_id: 'thr_q3_planning',
  },
  {
    id: 'm4',
    sender: 'news@tool.io',
    to: ['mike@example.com'],
    subject: 'This week in devtools: 5 new launches',
    body_text:
      'Your weekly digest: 5 new devtool launches, 3 tutorials, and our ' +
      'podcast episode on platform engineering.\n\nUnsubscribe anytime.',
    received_at: hoursAgo(7),
    thread_id: null,
  },
  {
    id: 'm5',
    sender: 'security@saas.com',
    to: ['mike@example.com'],
    subject: 'You turned on 2-step verification',
    body_text:
      'Hi Mike,\n\nThis is a confirmation that 2-step verification was turned ' +
      'on for your account. If this was not you, reset your password immediately.\n\n— Security Team',
    received_at: hoursAgo(9),
    thread_id: null,
  },
  {
    id: 'm6',
    sender: 'sales@vendor.com',
    to: ['mike@example.com'],
    subject: "Re: Re: Follow-up on last month's quote",
    body_text:
      'Hi Mike,\n\nFollowing up on the quote we sent three weeks ago. If pricing ' +
      'is a concern, we can get approval for 20% off the SSO integration and ' +
      'SLA upgrade you asked about.\n\nHappy to set up a 30-minute call whenever ' +
      'suits you.\n\nBest,\nFrank Liu, Vendor Sales',
    received_at: hoursAgo(12),
    thread_id: 'thr_vendor_quote',
  },
  {
    id: 'm7',
    sender: 'winner@lucky-draw.xyz',
    to: ['mike@example.com'],
    subject: 'CONGRATULATIONS!!! You won $5,000,000',
    body_text:
      'Dear lucky winner, you have been selected to receive $5,000,000. ' +
      'Send your bank details to claim your prize NOW!!!',
    received_at: hoursAgo(14),
    thread_id: null,
  },
  {
    id: 'm8',
    sender: 'billing@saas.com',
    to: ['mike@example.com'],
    subject: 'Your May invoice $2,340.00',
    body_text:
      'Hello,\n\nYour May 2026 invoice is ready:\n\n  Invoice No.: INV-2026-05-009827\n' +
      '  Billing period: 2026-04-19 to 2026-05-18\n  Amount: $2,340.00 (tax included)\n' +
      '  Due date: 2026-06-02\n\nYour card on file (ending 1234) will be charged ' +
      'automatically on 5/28.\n\n— SaaS Billing Team',
    received_at: hoursAgo(26),
    thread_id: null,
  },
  {
    id: 'm9',
    sender: 'lily@company.com',
    to: ['mike@example.com', 'cto@company.com'],
    subject: 'Taking Thursday off',
    body_text:
      'Hi both,\n\nI need to take Thursday (5/22) off to accompany a family member ' +
      'to a hospital check-up. Cover is arranged: Alex hosts the standup, the ' +
      'canary rollout moves to Friday (synced with SRE), and client follow-ups ' +
      'will be done Wednesday afternoon.\n\nThanks for understanding!\nLily',
    received_at: hoursAgo(30),
    thread_id: 'thr_lily_leave',
  },
  {
    id: 'm10',
    sender: 'noreply@saas.com',
    to: ['mike@example.com'],
    subject: 'Your password expires in 7 days',
    body_text:
      'Reminder: your workspace password expires in 7 days. Update it in ' +
      'Settings → Security to avoid being locked out.\n\n— SaaS Team',
    received_at: hoursAgo(50),
    thread_id: null,
  },
];
