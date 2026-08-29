# Inbox Management Workspace

Professional full-stack workspace for automated inbox triage, prioritization, and reply drafting with human-in-the-loop approvals, live pipeline visualization, and pluggable email providers.

**Live Demo:** https://inbox-workspace.vercel.app

**Category:** Productivity / Communication

**Stack:** Python Â· React 18 Â· Vite Â· State Workflow Â· Workflow Engine Â· Platform Services

## Overview

Inbox Management Workspace processes email end-to-end: it fetches messages, classifies and prioritizes them by configurable rules, and drafts replies through a three-stage service workflow (Analyst â†’ Writer â†’ Polisher). Every draft pauses at a review checkpoint â€” approve, edit, reject, regenerate, or skip before any action is taken. The pipeline streams real-time progress to a responsive React interface over server-sent events.

Shipped with realistic mock data for immediate evaluation and a one-variable switch to live IMAP for production use. Built for reliable, auditable communication workflows with enterprise-grade observability and deployment readiness.

## Features

- **Multi-Stage Drafting Workflow** â€” Sequential services for triage analysis, reply composition, and voice polishing produce context-aware, tone-matched drafts.
- **Human-in-the-Loop Approvals** â€” State workflow pauses at each draft for explicit user decisions; resume with approve / edit / reject / regenerate / skip.
- **Real-Time Pipeline Visualization** â€” SSE streams node-level progress; the UI renders a live flow diagram and streaming narrative.
- **Pluggable Email Source** â€” Ships with 10 realistic mock messages; switch to live IMAP with a single environment variable.
- **Prioritization & Rules Engine** â€” Classification, VIP boosts, and user-defined rules sort and filter actionable messages.

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
â”œâ”€â”€ services/email/                 # Backend: Python service handlers
â”‚   â”œâ”€â”€ run.py                      # /email/run â€” main SSE entry (fetchâ†’classifyâ†’draftâ†’review loop)
â”‚   â”œâ”€â”€ review.py                   # /email/review â€” resume from checkpoint
â”‚   â”œâ”€â”€ history.py                  # /email/history â€” conversation list / get / delete
â”‚   â”œâ”€â”€ stop.py                     # /email/stop â€” abort active run
â”‚   â”œâ”€â”€ health.py                   # /email/health â€” liveness probe + provider info
â”‚   â”œâ”€â”€ _graph.py                   # State workflow definition & compilation
â”‚   â”œâ”€â”€ _state.py                   # Workspace state definitions
â”‚   â”œâ”€â”€ _nodes.py                   # 7 node functions (fetch, classify, prioritize, draft, review, apply, summarize)
â”‚   â”œâ”€â”€ _routing.py                 # Conditional edge routing
â”‚   â”œâ”€â”€ _crew.py                    # Workflow service adapter
â”‚   â”œâ”€â”€ _models.py                  # Domain models (Email, DraftItem, ReviewDecision)
â”‚   â”œâ”€â”€ _providers.py               # Email provider protocol + mock + IMAP
â”‚   â”œâ”€â”€ _events.py                  # Service event bridge
â”‚   â”œâ”€â”€ _llm.py                     # Platform service client initialization
â”‚   â”œâ”€â”€ _tools.py                   # Service tools (tone, template, thread context)
â”‚   â”œâ”€â”€ _crews/                     # Crew definitions (YAML service + task configs)
â”‚   â”œâ”€â”€ fixtures/                   # Mock messages + user_rules.json
â”‚   â”œâ”€â”€ skills/                     # Skill definitions (tone, templates, triage rules)
â”‚   â””â”€â”€ prompts/                    # System prompts for workflow nodes
â”œâ”€â”€ src/                            # Frontend: React + Vite
â”‚   â”œâ”€â”€ App.tsx                     # SSE state machine + pipeline reducer
â”‚   â”œâ”€â”€ components/                 # ChatLayout, InboxTree, ConversationStream, DraftReviewCard, FlowVisualizer
â”‚   â”œâ”€â”€ i18n.tsx                    # Internationalization (zh/en)
â”‚   â””â”€â”€ historyStorage.ts           # localStorage conversation index
â”œâ”€â”€ edgeone.json                    # Runtime configuration
â”œâ”€â”€ requirements.txt                # Python dependencies
â””â”€â”€ package.json                    # Frontend build
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

Live Demo: https://inbox-workspace.vercel.app

## Customization

- **Workflow Logic:** Edit `services/email/_graph.py`, `_nodes.py`, and `_routing.py` to add stages or change sequencing.
- **Drafting Stages:** Update crew definitions in `services/email/_crews/` and prompts in `services/email/prompts/` to adjust tone and structure.
- **Providers:** Extend `services/email/_providers.py` to add new email sources beyond mock and IMAP.
- **Frontend:** Components in `src/components/` and state handling in `src/App.tsx` control layout and review interactions.
- **Rules:** Modify `services/email/fixtures/user_rules.json` and skills in `services/email/skills/` for triage and template behavior.

## License

MIT
