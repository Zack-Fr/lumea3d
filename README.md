<img src="./readme/title1.svg"/>
<br><br>
<!-- project overview -->
<img src="./readme/title2.svg"/>

Lumea3D is a web-based platform for 3D visualization and collaboration. Designers and clients co‑edit scenes in real time. Generative helpers suggest materials, lighting moods, and layout variants (solver not included in this repo). Goal: shorten design feedback loops.

**Why it matters:** Fewer static renders. Faster approvals. Shared live context.

**At a glance:** Real-time presence • Variant generation • High‑fidelity WebGL • Inline comments & share links.
<br><br>
<!-- System Design -->
<img src="./readme/title3.svg"/>
Client (WebGL/Three.js) ↔ Realtime (WebSockets via Socket.IO for presence + ops, plus SSE) ↔ Services (Auth, Users, Projects, Scenes, Assets, Collaboration, Processing, AI Adapter) ↔ Storage (PostgreSQL + Redis + S3/MinIO) ↔ CDN (assets & thumbnails).

Flow: User action → op broadcast → peers reconcile → scene graph updates. Extensible via AI provider and plugin hooks.

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Web Frontend      │    │    API Backend      │    │ AI Generative Svcs  │
│(React/Vite/Three.js)│◄──►│ (NestJS + Swagger)  │◄──►│  (Adapter/External) │
└──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
           │                          │                          │
           │                ┌─────────▼─────────┐                │
           │                │    PostgreSQL     │                │
           │                │  + Prisma (ORM)   │                │
           │                └─────────┬─────────┘                │
           │                          │                          │
   ┌───────▼────────┐        ┌────────▼────────┐       ┌────────▼────────┐
   │   Socket.IO     │        │      Redis      │       │   S3 / MinIO    │
   │+ SSE (Realtime) │        │ (Queue/Cache)   │       │(Assets & Thumbs)│
   └─────────────────┘        └─────────────────┘       └─────────────────┘
```

**Entities:** Users; Projects → Scenes → Placements; Assets (Meshes, Materials, HDRIs); Collaboration (Sessions, Invites); Feedback/Comments.
| ERD DIAGRAM |
| ----------- |
![Entity Relationship Diagram](./readme/erd-diagram.svg)
<br><br>
<!-- Project Highlights -->
<img src="./readme/title4.svg"/>
<br><br>
- Live camera & presence cursors
- One-click material and lighting variants
- Shareable interactive review links
- Snapshots with quick revert
- Context-aware asset suggestions
<br><br>

<!-- Demo -->
<img src="./readme/title5.svg"/>

| Login |
| ----- |
| ![Login](./readme/login-page-flow.gif) 

| Live Collaboration |
| ----- |
| ![Dashboard](./readme/project-page-flow.gif) |

| Landing Page |
| ------------ |
| ![Landing](./readme/landing-page-01.png) |

**3D Asset Attribution:** [Library Hall Scene](https://www.turbosquid.com/3d-models/library-hall-blender-scene-2367730) (TurboSquid)



User Flow: Create project → Add assets → Adjust and annotate → Generate variants → Share link.
<br><br>
<!-- Development & Testing -->
<img src="./readme/title6.svg"/>
<br><br>

| Area | Stack |
| ---- | ----- |
| Frontend | React + Vite + Three.js |
| Backend | Node.js (NestJS) + Prisma |
| Realtime | WebSockets (Socket.IO) + SSE |
| Queue | Bull (Redis) |
| Storage | S3/MinIO (signed URLs) |
| Validation | Zod / JSON Schema |
| Docs | Swagger (OpenAPI) at /docs |
| Testing | Vitest/Jest + Playwright/Cypress |
| Lint/Format | ESLint + Prettier |

Common scripts (Make):
- Start stack (Docker): make up ENV=development (run from backend directory)
- Wait until healthy: make wait
- Run DB migrations: make migrate
- Seed demo data: make seed
- View logs: make logs
- Stop stack: make down
- Clean volumes: make clean
- Generate OpenAPI spec: make openapi
- Quick dev start/teardown: make dev-quick / make dev-reset

Optional (pnpm, backend root):
- Run all packages in dev: pnpm dev
- API dev only: pnpm --filter api start:dev
- API build/prod: pnpm --filter api build && pnpm --filter api start:prod

Performance levers: GPU instancing, frustum culling, delta ops (patch-based updates), lazy texture decode/streaming, thumbnail precompute, KTX2/Draco/Meshopt asset variants.
<br><br>
<!-- Deployment -->
<img src="./readme/title7.svg"/>

### Ops & Roadmap (Condensed)
Deploy progression: dev → staging → prod. Assets via CDN. Feature flags govern gradual rollout. RBAC + signed asset URLs.

Build & run (example):
- Docker (full stack): make up ENV=development (run from backend directory)
- Health/migrate/seed: make wait && make migrate && make seed
- Logs/teardown: make logs | make down | make clean
- Backend (direct): pnpm --filter api build && pnpm --filter api start:prod

**Roadmap (prioritized):**

MVP / Near-Term
- [ ] Time-travel scene timeline — record transforms, material swaps & comments; scrub playback < 200ms step.
- [ ] Public embed viewer — lightweight read-only embed (<500KB gzipped JS) with orbit camera + annotation popovers.

Growth / Expansion
- [ ] Mobile AR quick preview — one-click generate GLB/USDZ + QR code; load under 5s for <10MB scene.
- [ ] Blender exporter (initial DCC integration) — preserve hierarchy + PBR material mapping.
- [ ] Virtual asset library browsing — searchable tagged catalog + similarity-based suggestions.

Strategic / Longer-Term
- [ ] Additional DCC integrations (Houdini; evaluate Unreal / Datasmith flow).
- [ ] Partner / marketplace library ingestion (licensing + attribution hooks).
- [ ] Plugin API (scene context hook + operation interception).
- [ ] Shareable scene diff links (deep link to specific timeline state).

**Tech Snapshot:** Three.js • React • NestJS • Prisma • PostgreSQL • Redis • Socket.IO • Bull • S3/MinIO • WebSockets/SSE • AI adapter

## License & Contact
License: MIT
Contact: @Zack-Fr
