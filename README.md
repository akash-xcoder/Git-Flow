# GitFlow

**Visualize any GitHub repository as an interactive execution-flow diagram.**

[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React Flow](https://img.shields.io/badge/React_Flow-11-ff0072)](https://reactflow.dev)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285f4?logo=google&logoColor=white)](https://ai.google.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Edge-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)

Paste a GitHub URL and GitFlow maps how code flows across UI, APIs, services, and data layers—ignoring boilerplate and rendering a clean, exportable dark-mode graph.

---

## Features

- **AI Execution-Flow Mapping** — Fetches the repo tree (`/api/github`) and uses Gemini (`/api/generate`) to group functional clusters and label data-flow edges, with automatic deterministic fallback.
- **Interactive Graph Canvas** — Pan, zoom, minimap, topology presets, searchable file drawer, and a side inspector for editing nodes or branching stages.
- **Semantic Styling & Context Menu** — Auto-colors nodes by layer (`UI`, `API`, `Logic`, `Database`); right-click any node or edge to switch neon glow colors or open the file on GitHub.
- **Smart Layout & Physics** — Top-to-bottom (`TB`) and left-to-right (`LR`) compound Dagre layout, real-time drag collision prevention, and 4-way edge handle snapping.
- **Clean PNG & SVG Export** — Exports high-resolution PNG and vector SVG snapshots with glowing edge paths and labels intact.
- **Caching & Push Sync Ready** — Includes a Supabase `cached_diagrams` schema (RLS + `updated_at` trigger) and a `github-sync` Edge Function for GitHub `push` webhooks.

---

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) (or Node.js 20+)

```bash
git clone https://github.com/akash-xcoder/Git-Flow.git
cd Git-Flow
bun install
cp .env.example .env.local
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter any public repo URL (e.g. `vercel/next.js`).

### Environment Variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Enables Gemini architecture generation (falls back to static analysis if unset) |
| `GITHUB_TOKEN` | *(Optional)* Increases GitHub REST API rate limits |
| `APP_URL` | *(Optional)* Public base URL (defaults to local dev) |
| `GITHUB_WEBHOOK_SECRET` | *(Optional)* Supabase Edge Function secret for `github-sync` webhooks |

---

## How It Works

```text
GitHub URL ─▶ /api/github (file tree) ─▶ /api/generate (Gemini flow JSON) ─▶ Dagre + React Flow
```

<details>
<summary><strong>Supabase Caching & Webhook Setup (Optional)</strong></summary>

- **Database (`supabase/migrations/`):** Creates `public.cached_diagrams` (`repo_url`, `commit_hash`, `flow_json`, timestamps) with public read RLS and `service_role`-only writes.
- **Webhook (`supabase/functions/github-sync`):** Deno Edge Function handling GitHub `ping` and `push` events (`x-github-event`).

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set GITHUB_WEBHOOK_SECRET="<your-secret>"
supabase functions deploy github-sync
```

Point your GitHub repository's **Push Webhook** to:
`https://<project-ref>.supabase.co/functions/v1/github-sync` (`application/json`).

</details>

---

## Tech Stack & Structure

**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · React Flow · Dagre · `@google/genai` · Supabase

```text
├── app/            # App Router pages & API routes (/api/github, /api/generate)
├── components/     # CustomNode, GroupNode, ContextMenu, NodeInspectorPanel
├── lib/            # Graph parsing, categorization, normalization & tests
├── utils/          # Compound Dagre auto-layout
├── src/utils/      # Collision resolution, edge snapping, export & styling helpers
└── supabase/       # Postgres migrations & github-sync Edge Function
```

---

## Development

```bash
bun test       # Run unit tests
bun run lint   # Run ESLint
bun run build  # Production build
```

---

## Contributing

Issues and pull requests are welcome. Fork the repo, create a feature branch, verify with `bun test && bun run lint && bun run build`, and open a PR.
