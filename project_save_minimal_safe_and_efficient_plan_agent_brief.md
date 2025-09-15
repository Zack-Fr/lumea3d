# Project Save — Minimal, Safe, and Efficient Plan (Agent Brief)

> **Context:** Instancing is **OFF**. We need a simple, robust way to persist **all scene edits** (object transforms, materials, shell props, camera prefs) so users never lose changes. Keep it compatible with current stack (React + R3F, NestJS + Prisma + Postgres, SceneManifest v2, SSE/WS).

---

## 0) Goal (one line)
**Single‑writer, versioned "delta‑patch" save**: the editor sends **batched ops** for changed items; the API applies them atomically, bumps a **scene version**, and returns the new ETag. Optional **manual snapshot** creates a restore point.

---

## 1) Minimal Model Changes (Prisma)
```prisma
model Scene3D {
  id         String   @id @default(cuid())
  projectId  String
  version    Int      @default(1)        // bump on every successful write
  props      Json?
  updatedAt  DateTime @updatedAt
  // ...existing fields
}

model Item {
  id        String   @id @default(cuid())
  sceneId   String   @index
  assetId   String
  // canonical transform (authoritative)
  position  Json     // [x,y,z]
  yawDeg    Float    // Y‑axis rotation in degrees
  scale     Json     // [sx,sy,sz]
  // optional
  materialOverrides Json?
  locked    Boolean  @default(false)
  // ...existing fields
}

model SceneSnapshot {
  id        String   @id @default(cuid())
  sceneId   String   @index
  label     String   // e.g., "Manual Save" or auto timestamp
  manifest  Json     // entire scene manifest v2 for restore
  createdAt DateTime @default(now())
}
```
> **Note:** No breaking change. If `Item` already has position/rotation/scale, use them; otherwise add `yawDeg` and store R3F Euler→yaw only.

---

## 2) API Contracts (authoritative)

### 2.1 Save (batch delta)
`PATCH /scenes/:sceneId/items`
- **Headers:** `If-Match: <sceneVersion>`, `Idempotency-Key: <uuid>` (optional but recommended)
- **Body** (`DeltaOp[]`):
```jsonc
[
  { "op": "update_item", "id": "itemId", "transform": { "position": [1,0,2], "rotation_euler": [0, 90, 0], "scale": [1,1,1] } },
  { "op": "add_item",    "assetId": "asset123", "transform": { "position": [0,0,0], "rotation_euler": [0,0,0], "scale": [1,1,1] } },
  { "op": "remove_item", "id": "itemId2" },
  { "op": "update_props", "shell": { "shadows": { "cast": false, "receive": true } } },
  { "op": "update_material", "id": "itemId", "materialOverrides": { "Seat": { "pbr": { "roughnessFactor": 0.6 } } } }
]
```
- **Response (200):** `{ version: <newInt>, etag: "W/\"v<newInt>\"" }`
- **Errors:** `412 Precondition Failed` (version mismatch) → client must **resync manifest** and retry; `409` if idempotency replay; `400` if invalid op.

### 2.2 Snapshot (manual save‑as)
`POST /scenes/:sceneId/snapshots`
- **Body:** `{ "label": "Manual Save" }`
- **Response:** `{ snapshotId }`

> **Server behavior:** builds **Manifest v2** from DB (Items + shell props) and stores it in `SceneSnapshot.manifest` for rollback.

### 2.3 Load snapshot (optional later)
`POST /scenes/:sceneId/restore` with `{ snapshotId }` → replaces Items + props from `manifest` and bumps `version`.

---

## 3) Frontend Pattern (simple & efficient)

### 3.1 Local change queue (debounced flush)
```ts
// useSaveQueue.ts
const queue: DeltaOp[] = []
let pending = false

export function stage(op: DeltaOp) {
  queue.push(op)
  debounceFlush()
}

async function flush() {
  if (!queue.length || pending) return
  pending = true
  const ops = queue.splice(0, queue.length)
  const res = await api.patch(`/scenes/${sceneId}/items`, ops, { headers:{ 'If-Match': version, 'Idempotency-Key': crypto.randomUUID() } })
  version = res.data.version // update local version
  pending = false
}

const debounceFlush = debounce(flush, 400) // coalesce micro-edits
```
- Call `stage(update_item)` on **pointer up** from TransformControls, not on every mouse move.
- Coalesce multiple edits within **400 ms** to one network call.

### 3.2 Optimistic UI
- Apply transforms to meshes immediately.
- On `412`, **pause edits**, refetch manifest, reconcile (most recent wins), then re‑enqueue unsaved ops.

### 3.3 Manual Save button
- Calls `POST /scenes/:sceneId/snapshots` and shows a toast `Saved` with timestamp.

### 3.4 Autosave indicator (optional)
- Small dot / text: `All changes saved` switches to `Saving…` while a flush is in flight.

---

## 4) Server Apply Logic (NestJS service sketch)
```ts
async function applyDelta(sceneId: string, ops: DeltaOp[], ifMatch?: number, idem?: string) {
  const scene = await prisma.scene3D.findUnique({ where:{ id: sceneId } })
  if (ifMatch && scene.version !== ifMatch) throw new PreconditionFailedException()

  return await prisma.$transaction(async (tx) => {
    for (const op of ops) {
      switch (op.op) {
        case 'update_item':
          await tx.item.update({ where:{ id: op.id }, data:{
            position: op.transform.position,
            yawDeg: op.transform.rotation_euler?.[1] ?? undefined,
            scale: op.transform.scale,
          }})
          break
        case 'add_item':
          await tx.item.create({ data:{ sceneId, assetId: op.assetId, position: op.transform.position, yawDeg: op.transform.rotation_euler?.[1] ?? 0, scale: op.transform.scale } })
          break
        case 'remove_item':
          await tx.item.delete({ where:{ id: op.id } })
          break
        case 'update_props':
          await tx.scene3D.update({ where:{ id: sceneId }, data:{ props: mergeDeep(scene.props ?? {}, op) } })
          break
        case 'update_material':
          await tx.item.update({ where:{ id: op.id }, data:{ materialOverrides: op.materialOverrides } })
          break
      }
    }
    const updated = await tx.scene3D.update({ where:{ id: sceneId }, data:{ version: { increment: 1 } } })
    return { version: updated.version }
  })
}
```

- **Atomic**: whole batch succeeds or fails.
- **Version bump**: once per batch.
- **Idempotency**: store `idempotencyKey` in a table if you want strict once‑only semantics.

---

## 5) Options & When to Use Them

**A) Delta‑only (recommended now)**  
- Pros: smallest payloads, simple conflict handling (ETag), matches our existing DELTA stream.  
- Cons: need a Snapshot for user‑visible restore points.

**B) Full scene snapshot on every save**  
- Pros: simplest mental model (save = rewrite).  
- Cons: heavy payloads; more write amplification; still need deltas for realtime.

**C) Event‑sourced command log**  
- Pros: perfect undo/redo & audit.  
- Cons: more infra; requires compaction; overkill for MVP.

**Choice:** **A + manual snapshots** (this plan). It’s efficient and safe.

---

## 6) Edge Cases & Safeguards
- **Browser refresh/close:** `beforeunload` checks queue; trigger final `flush()`; persist unsent ops to `localStorage` and replay on load.
- **Network loss:** keep queue; show `Offline` banner; background retry.
- **Auth expiry:** if `401`, refresh token then retry; if still failing, pause and prompt login.
- **Version conflict (412):** refetch manifest → reconcile → re‑enqueue unsaved ops.
- **Delete safety:** on delete, remove mesh only after 200 OK (or implement optimistic with revert on failure).

---

## 7) Acceptance Criteria
- Move/rotate/scale an object → change persisted; reload page → object matches.
- Batch multiple edits quickly → one network call; server version increments by 1.
- Manual Save creates a snapshot visible in a list; restoring works (if implemented).
- Conflict test (two tabs): tab B saves, tab A gets `412`, resyncs, and replays without data loss.

---

## 8) Branching & PR Notes
- **Backend:** `feat/scene-delta-save` (migrations + controller/service + tests)
- **Frontend:** `feat/editor-save-delta` (save queue + UI + tests)
- Keep commits **cohesive** (no feature toggles mixed). Run smoke:
  - FE: stage → flush → reload → assert state.
  - BE: PATCH with `If-Match` passes/fails appropriately.

---

## 9) Minimal UI Copy
- Autosave: `All changes saved • v{version}` / `Saving…`
- Snapshot: `Saved as {label}` / `Restore` → `Restored snapshot {label}`

---

**This plan is the simplest path**: authoritative DB state + batched deltas + version ETag + optional snapshots. It’s performant, resilient, and fully compatible with our realtime and manifest streams. Guide agents to implement **exactly this** to avoid rework.

