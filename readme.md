# CRDT Server — Yjs + Hocuspocus

A lightweight collaboration backend powering real-time document editing.

This server maintains Yjs documents, enforces permission rules, and syncs changes between multiple connected clients using the Hocuspocus WebSocket server.

## Features

- **CRDT-based collaboration** using Yjs for conflict-free editing
- **Hocuspocus provider** for WebSocket transport, awareness, and persistence hooks
- **Document permission validation** before room join
- **On-demand snapshot persistence** to upstream Document API
- **Content model abstraction** for consistent data contracts with your main backend API
- **Simple horizontal scaling** — clients remain consistent regardless of ordering

## Folder Overview

```bash
├── config
│   └── index.ts           # configuration loader, env parsing
├── index.ts               # Hocuspocus server bootstrap
├── models
│   ├── Content.ts         # Yjs content metadata model (snapshot, versioning)
│   └── Permission.ts      # Access-level model (READ, WRITE, NONE)
├── services
│   └── apiService.ts      # external REST API communicator (token, doc fetch/store)
└── utils
                          # small helpers (logging, safe JSON, debounce, etc.)
```

## Environment Variables

Create a `.env` file:

```env
SERVER_URL=            # base URL of your main 
PORT=1234              # CRDT server port
```

`SERVER_URL` is required — used by apiService to fetch permissions, snapshots, and persist updates.

## Installation & Usage

### Install

```bash
npm install   # or npm / yarn
```

### Run in Dev

```bash
npm run dev
```

### Build & Run Production

```bash
npm run build
pnpm start
```

Your WebSocket endpoint will typically be:

```bash
ws://localhost:<PORT>
```

Configure your frontend Hocuspocus provider with that URL.

## Architecture

### 1. Server Bootstrap (index.ts)

`index.ts` constructs a Hocuspocus server instance:

- Room lifecycle hooks (`onConnect`, `onAuthenticate`, `onLoadDocument`, `onStoreDocument`)
- Awareness broadcast: user cursors, selection, presence
- Permission enforcement via Permission model + apiService
- Snapshot merge after clients disconnect or periodically

### 2. Document Persistence

Handled inside `onLoadDocument` and `onStoreDocument`:

**Load:**
The server fetches the latest stored document content (`Content.ts` DTO) from your main backend using `apiService.fetchDocumentContent(publicId)` and loads it into a `Y.Doc` instance.

**Store:**
When changes occur—or when the last client leaves—the Yjs update is encoded (usually `Y.encodeStateAsUpdate(doc)`) and persisted back via `apiService.saveDocumentSnapshot(...)`.

This ensures the CRDT server remains stateless between restarts if your main API handles persistence.

### 3. Permission Enforcement

`Permission.ts` defines allowed operations.

Flow inside `onAuthenticate`:

1. Client passes document ID + access token
2. CRDT server queries the backend (`apiService.getDocumentPermission`)
3. If permission is not sufficient for write/read, connection is rejected
4. Awareness fields (userId, name, etc.) are allowed only for authorized users

### 4. Awareness / Presence

Hocuspocus forwards Yjs awareness updates:

- Remote cursors
- Online user list
- Editor selection markers

Use throttling to limit high-volume messages and avoid unnecessary backend calls.

## External API Calls (apiService.ts)

`apiService.ts` wraps all interactions with your main backend:

Example responsibilities:

- `getDocumentPermission(documentId, token)`
- `fetchDocumentContent(documentId)`
- `saveDocumentSnapshot(documentId, yjsBinaryUpdate)`

Usually implemented using axios or undici/fetch, with retries and exponential backoff for store operations.

### Recommended Patterns

- Always validate server responses
- Implement timeouts (5–10 seconds) to avoid blocking the event loop
- Use structured logging
- Cache permission responses for short intervals (<30 seconds) to reduce load

## Utils

Typical utilities kept here:

- `logger.ts` — timestamped logs
- `safeJson.ts` — robust parsing
- `debounce.ts` — used for delayed persistence
- `yjsHelpers.ts` — encode/decode helpers

Keep utils pure and small.

## Scaling Considerations

Hocuspocus supports distributed scaling using Redis Awareness + Redis Persistence adapters.

If you plan to run multiple CRDT servers, add a Redis instance and enable:

- RedisPersistence
- RedisPubSub for awareness

Otherwise, you risk partitioned states between servers.

## Security Notes

- Never trust client-sent document IDs — always verify with backend
- Reject clients without valid tokens before joining room
- Never allow direct access to stored snapshots without verifying `Permission.WRITE` / `Permission.READ`
- Rate-limit `onConnect` to prevent abuse
- Consider signing all server-to-backend requests with a shared secret (`API_KEY`)

## Testing

Suggested tests:

- Load existing document → ensure correct Yjs state
- Write updates → persist snapshot → reload → documents match
- Permission logic: unauthorized users cannot join
- Awareness events propagate correctly between two test clients
- Server restart keeps consistency after snapshot

Use Hocuspocus test utilities or plain WebSocket clients.

## Deployment

A minimal Node environment is enough:

- Deploy as standalone container (recommended)
- Configure readiness/liveness health checks
- Store persistent snapshots in your main backend or an object store (S3, MinIO)
- For heavy load, add Redis adapters for clustering

### Example Dockerfile (sketch)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
CMD ["node", "dist/index.js"]
```
