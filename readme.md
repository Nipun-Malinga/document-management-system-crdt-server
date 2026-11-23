# CRDT Server (Yjs + Hocuspocus)

This is the real-time collaboration server for the Document Management System.

- **Solo documents** (not shared) are read and written by the frontend directly over the Spring REST API.
- **Collaborative documents** (shared with at least one user) are edited only through this server. The backend rejects REST content writes for them with `409 Conflict`.

```
Browser (Tiptap + HocuspocusProvider, user JWT)
   │ ws(s)  room = documents/{documentId}/branches/{branchId}
   ▼
CRDT server
   onAuthenticate  ─► GET /api/permissions/documents/{d}/branches/{b}    (user's Bearer JWT)
   onLoadDocument  ─► GET /api/internal/crdt/documents/{d}/branches/{b}  (X-Internal-Secret)
   onStoreDocument ─► PUT /api/internal/crdt/documents/{d}/branches/{b}  (X-Internal-Secret)
   ▼
Spring backend → document_contents.content (Tiptap JSON string)
```

## How it works

- **Authentication** (`onAuthenticate`):
  1. The room name is validated against `documents/{uuid}/branches/{uuid}`.
  2. The user's token is checked against the backend's permissions endpoint.
  3. `UNAUTHORIZED`, a missing permission, or any error throws, and the connection is rejected.
  4. `READ_ONLY` connections are marked `readOnly`, so the server drops their document updates.
- **Load** (`onLoadDocument`): the stored Tiptap JSON is converted to a `Y.Doc` with `TiptapTransformer`. If the backend is unreachable, loading throws. This is deliberate: serving an empty doc and saving it back later would wipe real content.
- **Store** (`onStoreDocument`): debounced, 2s by default and at most 10s. The `Y.Doc` is converted back to Tiptap JSON and saved through the internal endpoint using the shared secret. Saving does not depend on any user's token expiry.
- **Shutdown:** on SIGINT/SIGTERM, Hocuspocus flushes pending stores before exiting.

### Schema parity

`src/config/index.ts` must mirror the frontend's `editorExtensions(true)` in `src/features/editor/configs/EditorConfigs.ts`. If a node, mark or attribute is missing here, it is silently dropped when a room loads. The frontend's `enableContentCheck` then disables collaboration. `npm test` round-trips a fixture of every node, mark and attribute through the server schema and fails on any loss.

### Known limitation: JSON-only persistence

Only Tiptap JSON is stored, not the Yjs binary state. Each time a room loads, the `Y.Doc` is rebuilt with a new CRDT history.

If this server restarts while a browser tab stays connected, that tab's old `Y.Doc` could merge with the rebuilt one and duplicate content. The frontend guards against this by recreating its `Y.Doc` when the connection drops. Persisting the Yjs state is the planned long-term fix.

## Environment

| Variable | Required | Description |
|---|---|---|
| `SERVER_URL` | yes | Backend base URL **including `/api`**, e.g. `http://localhost:8080/api`. In Docker it is set by `docker/compose.yml` to `http://backend:8080/api` |
| `CRDT_INTERNAL_SECRET` | yes | Shared secret; must equal the backend's `CRDT_INTERNAL_SECRET` (`openssl rand -hex 32`) |
| `PORT` | no | WebSocket port (default `1234`) |
| `REQUEST_TIMEOUT_MS` | no | Backend request timeout (default `5000`) |

The server exits on startup if a required variable is missing.

## Usage

```bash
npm install
npm run dev                  # tsx watch (reloads on change)
npm test                     # schema round-trip test
npm run build && npm start   # compiles to dist/ and runs it
```

### Docker (via [Task](https://taskfile.dev))

Docker files live in `docker/`. The base `compose.yml` is combined with `compose.dev.yml` (reads `.env`) or `compose.prod.yml` (reads `.env.prod`; see `.env.prod.example`).

```bash
task dev:up        # source bind-mounted, reloads with tsx watch
task dev:logs
task dev:down
task prod:build    # docker/Dockerfile.prod → nipunmalinga/doc-manager-crdt-server
task prod:up
task --list        # all tasks
```

The frontend connects with `VITE_COLLABORATIVE_CRDT_SERVER_WEBSOCKET_URL` (`ws://localhost:1234` in development, `wss://…` behind the reverse proxy in production).

## Deployment notes

- `docker/compose.prod.yml` binds to `127.0.0.1:1234`. Put a reverse proxy (nginx) in front that forwards WebSocket upgrades:
  ```nginx
  location /collab/ {
      proxy_pass http://127.0.0.1:1234/;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 3600s;
  }
  ```
- Don't expose the backend's `/api/internal/**` publicly. Block it at the proxy (`location /api/internal/ { deny all; }`), on top of the secret check.
- All three projects (backend, CRDT server, frontend) join the shared external Docker network `doc-frontend-network` (created by `task network:create`, which the up/start tasks run automatically) with the aliases `backend`, `crdt` and `frontend`. Use the aliases rather than the compose service names: the backend and this server are both named `server`.
- This server keeps rooms in memory, so run a single instance. Running several would need the Hocuspocus Redis extension.
