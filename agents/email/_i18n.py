"""Backend i18n for user-visible strings (SSE narration, labels, previews).

English-only: the frontend sends ``locale: "en"`` in the /email/run and
/email/review request bodies; run.py stores it in the LangGraph state and
every node looks its strings up here via ``tr(locale, key, **kwargs)``.
``normalize_locale`` coerces anything else to "en" so old clients/tests
with no locale keep working.
"""
from __future__ import annotations

DEFAULT_LOCALE = "en"
VALID_LOCALES = ("en",)

# locale → natural-language name injected into LLM prompts ("Reply in …").
LANGUAGE_NAME = {"en": "English"}


def normalize_locale(value: object) -> str:
    """Coerce an arbitrary request-body value into a valid locale."""
    return value if value in VALID_LOCALES else DEFAULT_LOCALE


_STRINGS: dict[str, dict[str, str]] = {
    "en": {
        # ── fetch ──
        "fetch_cached": "⚡ Reusing {n} cached emails (fetch skipped)",
        "fetch_started": "📥 Fetching latest emails from the mailbox…",
        "fetch_done": "📥 Fetched · {n} emails to classify",
        "fetch_archived": " · {n} auto-archived",
        # ── classify ──
        "classify_cached": "⚡ Reusing cached classification (LLM skipped)",
        "classify_started": "🧠 LLM classifying {n} emails… (single batch call)",
        "classify_failed": "❌ Classification failed: {err}",
        "classify_unparsed": "❌ Failed to parse classification output",
        "classify_done": "✅ Classified · {n} emails labeled",
        # ── prioritize ──
        "prioritize_started": "📊 Applying rules and sorting…",
        "prioritize_done": "📊 Sorted · {n} to process",
        "prioritize_empty": "📊 Sorted · nothing needs a reply",
        "prioritize_target_missing": (
            "Email {id} is not in the current inbox — the cache may be stale, "
            "try 'Force Refresh' above"
        ),
        # ── draft ──
        "draft_started": "🤖 Crew starting a reply draft for '{subject}'",
        "draft_started_feedback": " · your feedback applied",
        "no_subject": "(no subject)",
        "draft_error": "❌ Crew error: {err}",
        "draft_done": "✅ Draft ready · {n} chars · awaiting your review",
        "placeholder_body": (
            "(Draft generation failed — the LLM didn't receive valid email "
            "context. Click ↻ Rewrite, or check the inputs wiring in "
            "_tasks.py / _crew.py.)"
        ),
        # ── CrewProgressBridge narration ──
        "agent_analyst": "🔍 Analyst reading the email",
        "agent_writer": "✍️ Writer drafting the reply",
        "agent_polisher": "🎨 Polisher adjusting the tone",
        "task_analyze": "Analyzing email intent",
        "task_draft": "Drafting the reply body",
        "task_polish": "Applying tone and signature",
        "step_prefix": "Step: {label}",
        "complete_prefix": "Done: {label}",
        "task_fallback": "(task)",
        # ── summarize ──
        "summarize_started": "📝 LLM generating the digest… (based on {n} decisions)",
        "summarize_failed": "⚠ Digest generation failed, using fallback template: {err}",
        "summarize_empty": "⚠ LLM returned an empty digest, using fallback template",
        "summarize_done": "✅ Digest ready · {n} chars",
        # ── fallback summary ──
        "fb_no_mail": "## Overview\n\nNo new emails today.",
        "fb_overview": "## Overview",
        "fb_inbox_total": "- Inbox total: {n}",
        "fb_classified": "- Classified: {n}",
        "fb_drafted": "- Drafts generated: {n}",
        "fb_decisions": "- Decisions: {n}",
        "fb_actions": "- Actions executed: {n}",
        "fb_attention": "## Needs Attention",
        "fb_decided": "## Decisions",
        # ── run.py task labels ──
        "task_triage_only": "Classify emails only",
        "task_daily_digest": "Process emails needing replies",
        "task_single_reply": "Process a single email",
        "draft_preview_prefix": "📨 For review: {subject}",
        # ── review.py decision labels ──
        "review_approve": "✓ Approve",
        "review_edit": "✏️ Use my edit",
        "review_reject": "✗ No reply",
        "review_regenerate": "↻ Rewrite",
        "review_skip": "↦ Skip",
        "review_edited_body": "(body edited)",
    },
}


def tr(locale: str, key: str, **kwargs) -> str:
    """Look up ``key`` in the locale table and format with ``kwargs``.

    Unknown keys fall back to the key itself (so a missing translation is
    visible but not fatal); unknown locales fall back to the default.
    """
    table = _STRINGS.get(locale) or _STRINGS[DEFAULT_LOCALE]
    text = table.get(key) or _STRINGS[DEFAULT_LOCALE].get(key) or key
    if kwargs:
        text = text.format(**kwargs)
    return text
