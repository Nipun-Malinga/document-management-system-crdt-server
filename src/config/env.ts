import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const port = Number(process.env.PORT ?? 1234);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

export const env = {
  port,
  /** Backend base URL including the `/api` prefix, e.g. http://backend:8080/api */
  serverUrl: required('SERVER_URL').replace(/\/+$/, ''),
  /** Shared secret for the backend's /api/internal/** endpoints. */
  internalSecret: required('CRDT_INTERNAL_SECRET'),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 5000),
};
