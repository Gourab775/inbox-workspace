# Inbox Management Workspace

Professional full-stack workspace for automated inbox triage, prioritization, and reply drafting with human-in-the-loop approvals, live pipeline visualization, and pluggable email providers.

**Live Demo:** https://gourab775.github.io/email-assistant-agent

**Category:** Productivity / Communication

**Stack:** Python · React 18 · Vite · State Workflow · Workflow Engine · Platform Services

## Overview

Inbox Management Workspace processes email end-to-end: it fetches messages, classifies and prioritizes them by configurable rules, and drafts replies through a three-stage service workflow (Analyst → Writer → Polisher). Every draft pauses at a review checkpoint — approve, edit, reject, regenerate, or skip before any action is taken. The pipeline streams real-time progress to a responsive React interface over server-sent events.

Shipped with realistic mock data for immediate evaluation and a one-variable switch to live IMAP for production use. Built for reliable, auditable communication workflows with enterprise-grade observability and deployment readiness.

## Features

- **Multi-Stage Drafting Workflow** — Sequential services for triage analysis, reply composition, and voice polishing produce context-aware, tone-matched drafts.
- **Human-in-the-Loop Approvals** — State workflow pauses at each draft for explicit user decisions; resume with approve / edit / reject / regenerate / skip.
- **Real-Time Pipeline Visualization** — SSE streams node-level progress; the UI renders a live flow diagram and streaming narrative.
- **Pluggable Email Source** — Ships with 10 realistic mock messages; switch to live IMAP with a single environment variable.
- **Prioritization & Rules Engine** — Classification, VIP boosts, and user-defined rules sort and filter actionable messages.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript |
| Backend | Python 3.11+, State Workflow, Workflow Engine |
| Services | Platform Services (model gateway) |
| Streaming | Server-Sent Events (SSE) with update + custom channels |
| Email | Mock Provider + IMAP Provider |
| Deployment | EdgeOne / GitHub Pages, Node.js + Python |

## Project Structure

```
email-assistant-agent/
├── services/email/                 # Backend: Python service handlers
│   ├── run.py                      # /email/run — main SSE entry (fetch→classify→draft→review loop)
│   ├── review.py                   # /email/review — resume from checkpoint
│   ├── history.py                  # /email/history — conversation list / get / delete
│   ├── stop.py                     # /email/stop — abort active run
│   ├── health.py                   # /email/health — liveness probe + provider info
│   ├── _graph.py                   # State workflow definition & compilation
│   ├── _state.py                   # Workspace state definitions
│   ├── _nodes.py                   # 7 node functions (fetch, classify, prioritize, draft, review, apply, summarize)
│   ├── _routing.py                 # Conditional edge routing
│   ├── _crew.py                    # Workflow service adapter
│   ├── _models.py                  # Domain models (Email, DraftItem, ReviewDecision)
│   ├── _providers.py               # Email provider protocol + mock + IMAP
│   ├── _events.py                  # Service event bridge
│   ├── _llm.py                     # Platform service client initialization
│   ├── _tools.py                   # Service tools (tone, template, thread context)
│   ├── _crews/                     # Crew definitions (YAML service + task configs)
│   ├── fixtures/                   # Mock messages + user_rules.json
│   ├── skills/                     # Skill definitions (tone, templates, triage rules)
│   └── prompts/                    # System prompts for workflow nodes
├── src/                            # Frontend: React + Vite
│   ├── App.tsx                     # SSE state machine + pipeline reducer
│   ├── components/                 # ChatLayout, InboxTree, ConversationStream, DraftReviewCard, FlowVisualizer
│   ├── i18n.tsx                    # Internationalization (zh/en)
│   └── historyStorage.ts           # localStorage conversation index
├── edgeone.json                    # Runtime configuration
├── requirements.txt                # Python dependencies
└── package.json                    # Frontend build
```

> `services/` is the canonical service directory and corresponds to the former `agents/` location.

## Getting Started

### Prerequisites

- Node.js 18+, npm
- Python 3.11+

### Installation

```bash
npm install
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SERVICE_API_KEY` | Yes | Platform gateway API key (platform-compatible). |
| `SERVICE_BASE_URL` | Yes | Gateway base URL, e.g. `https://gateway.edgeone.link/v1` |
| `SERVICE_MODEL` | No | Model identifier. Defaults to `@makers/deepseek-v4-flash` |
| `EMAIL_PROVIDER` | No | `mock` (default) or `imap` |
| `IMAP_HOST` | No | IMAP hostname (e.g. `imap.gmail.com`) |
| `IMAP_USER` | No | IMAP login username |
| `IMAP_APP_PASSWORD` | No | App-specific password |

> Note: `SERVICE_*` is an alias for `AI_GATEWAY_*` for backward compatibility.

### Development

```bash
npm run dev
# Services (EdgeOne runtime)
# edgeone makers dev
```

Open http://localhost:5173 and http://localhost:8080/agent-metrics for service observability.

### Build

```bash
npm run build
npm run preview
```

## Deployment

### EdgeOne Makers

Configured via `edgeone.json`:

- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- `services.framework`: `workflow`
- `services.runtime`: `python`
- `services.timeout`: `1800`

Bind `SERVICE_*` variables in the deployment environment and deploy via EdgeOne console or CLI.

### GitHub Pages / Static Hosting

Vite builds to `dist`. Deploy the frontend to GitHub Pages or any static host; service endpoints run on EdgeOne.

Live Demo: https://gourab775.github.io/email-assistant-agent

## Customization

- **Workflow Logic:** Edit `services/email/_graph.py`, `_nodes.py`, and `_routing.py` to add stages or change sequencing.
- **Drafting Stages:** Update crew definitions in `services/email/_crews/` and prompts in `services/email/prompts/` to adjust tone and structure.
- **Providers:** Extend `services/email/_providers.py` to add new email sources beyond mock and IMAP.
- **Frontend:** Components in `src/components/` and state handling in `src/App.tsx` control layout and review interactions.
- **Rules:** Modify `services/email/fixtures/user_rules.json` and skills in `services/email/skills/` for triage and template behavior.

## License

MIT
