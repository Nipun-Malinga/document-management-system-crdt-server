import axios from 'axios';
import { env } from '../config/env.js';
import type { Content } from '../models/Content.js';
import type { Permission, PermissionLevel } from '../models/Permission.js';
import type { DocumentRef } from '../utils/documentName.js';

const http = axios.create({
  baseURL: env.serverUrl,
  timeout: env.requestTimeoutMs,
});

const internalHeaders = { 'X-Internal-Secret': env.internalSecret };

const internalPath = ({ documentId, branchId }: DocumentRef) =>
  `/internal/crdt/documents/${documentId}/branches/${branchId}`;

/** Resolves the calling user's permission on a branch, using the user's own access token. */
export async function fetchPermission(ref: DocumentRef, token: string): Promise<PermissionLevel | undefined> {
  const { data } = await http.get<Permission>(
    `/permissions/documents/${ref.documentId}/branches/${ref.branchId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data?.permission;
}

/** Loads the stored Tiptap JSON (as a string) for a branch via the internal endpoint. */
export async function fetchContent(ref: DocumentRef): Promise<string | null> {
  const { data } = await http.get<Content>(internalPath(ref), { headers: internalHeaders });
  return data?.content ?? null;
}

/** Persists the Tiptap JSON (as a string) for a branch via the internal endpoint. */
export async function storeContent(ref: DocumentRef, content: string): Promise<void> {
  await http.put(internalPath(ref), { content }, { headers: internalHeaders });
}
