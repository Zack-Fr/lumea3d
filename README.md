yarn storybook
<img src="./readme/title1.svg"/>
<br><br>
<!-- project overview -->
<img src="./readme/title2.svg"/>

Lumea3D is a web-based 3D visualization & collaboration platform. Designers and clients co‑edit scenes in real time; generative helpers suggest materials, lighting moods, and layout variants (solver excluded here). Core focus: shorten design feedback loops.

**Why it matters:** Fewer static renders. Faster approvals. Shared live context.

**At a glance:** Real-time presence • Variant generation • High‑fidelity WebGL • Inline comments & share links.
<br><br>
<!-- System Design -->
<img src="./readme/title3.svg"/>
Client (WebGL/Three.js) ↔ Realtime (WebSockets presence + ops) ↔ Services (Assets, Auth, Collaboration, AI Adapter) ↔ Storage (Postgres + Redis) ↔ CDN (assets & thumbnails).

Flow: User action → op broadcast → peers reconcile → scene graph updates. Extensible via AI provider & plugin hooks.

**Entities:** Projects → Scenes → Objects; Assets (Meshes, Materials, HDRIs); Sessions; Comments.

![Entity Relationship Diagram](./readme/erd-diagram.svg)
<br><br>
<!-- Project Highlights -->
<img src="./readme/title4.svg"/>
<br><br>
- Live camera & presence cursors
- One-click material / lighting variants
- Shareable interactive review links
- Snapshot + quick revert
- Asset suggestions by context
<br><br>

<!-- Demo -->
<img src="./readme/title5.svg"/>

| Login | Live Collaboration |
| ----- | ------------------ |
| ![Login](./readme/login-page-flow.gif) | ![Dashboard](./readme/project-page-flow.gif) | ![Collab](./readme/demo/1440x1024.png) |

User Flow: Create project → Add assets → Adjust & annotate → Generate variants → Share link.
<br><br>
<!-- Development & Testing -->
<img src="./readme/title6.svg"/>
<br><br>
| Layer | Tooling |
| ----- | ------- |
| Frontend | React + Vite + Three.js |
| Backend | Node.js (Fastify/Express) |
| Realtime | WebSockets |
| Validation | Zod / JSON Schema |
| Tests | Jest/Vitest + Playwright/Cypress |


Performance levers: instancing, frustum culling, delta ops, lazy texture decode.
<br><br>
<!-- Deployment -->
<img src="./readme/title7.svg"/>

### Ops & Roadmap (Condensed)
Deploy progression: dev → staging → prod. Assets via CDN. Feature flags govern gradual rollout. Basic RBAC + signed asset URLs.

**Roadmap (short):**
- [ ] Time-travel scene timeline
- [ ] Public embed viewer
- [ ] Mobile AR quick preview

**Tech Snapshot:** Three.js • React • Node.js • Postgres • Redis • WebSockets • AI adapter

## License & Contact
License: MIT
Contact: @Zack-Fr
