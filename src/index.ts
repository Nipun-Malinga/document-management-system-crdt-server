import { Logger } from '@hocuspocus/extension-logger';
import { Server } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { isAxiosError } from 'axios';
import { Doc } from 'yjs';
import { FRAGMENT_NAME, serverExtensions } from './config/index.js';
import { env } from './config/env.js';
import { fetchContent, fetchPermission, storeContent } from './services/apiService.js';
import { parseDocumentName } from './utils/documentName.js';

const describeError = (error: unknown) =>
  isAxiosError(error)
    ? `${error.response?.status ?? error.code ?? 'network'} ${error.message}`
    : String(error);

const server = new Server({
  port: env.port,
  name: 'Collaboration CRDT Server',
  debounce: 2000,
  maxDebounce: 10000,
  extensions: [new Logger({ onChange: false })],

  /**
   * Authorizes the user against the backend with their own access token.
   * Throwing rejects the connection; the provider receives `onAuthenticationFailed`.
   */
  async onAuthenticate({ token, documentName, connectionConfig }) {
    const ref = parseDocumentName(documentName);

    if (!token) {
      throw new Error('Missing token');
    }

    const permission = await fetchPermission(ref, token).catch((error) => {
      console.warn(`Authentication failed for "${documentName}": ${describeError(error)}`);
      throw new Error('Not authorized');
    });

    if (!permission || permission === 'UNAUTHORIZED') {
      console.warn(`Unauthorized access attempt on "${documentName}"`);
      throw new Error('Not authorized');
    }

    connectionConfig.readOnly = permission === 'READ_ONLY';
  },

  /**
   * Seeds the room from the backend's stored Tiptap JSON. Errors are rethrown so the room
   * is never served (and later persisted) as an empty document after a transient failure.
   */
  async onLoadDocument({ documentName }) {
    const ref = parseDocumentName(documentName);

    let content: string | null;
    try {
      content = await fetchContent(ref);
    } catch (error) {
      console.error(`Failed to load "${documentName}": ${describeError(error)}`);
      throw error;
    }

    if (!content) return new Doc();

    return TiptapTransformer.toYdoc(JSON.parse(content), FRAGMENT_NAME, serverExtensions);
  },

  /** Persists the room back to the backend as Tiptap JSON (debounced by Hocuspocus). */
  async onStoreDocument({ documentName, document }) {
    const ref = parseDocumentName(documentName);
    const json = TiptapTransformer.fromYdoc(document, FRAGMENT_NAME);

    try {
      await storeContent(ref, JSON.stringify(json));
    } catch (error) {
      console.error(`Failed to store "${documentName}": ${describeError(error)}`);
      throw error;
    }
  },
});

// Hocuspocus stops on SIGINT/SIGTERM by default (`stopOnSignals`), flushing pending stores.
server.listen();
