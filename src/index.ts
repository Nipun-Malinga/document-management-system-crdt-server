import { Server } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { Doc } from 'yjs';
import { Content } from './models/Content';
import { Permission } from './models/Permission';
import APIService from './services/apiService';
import { serverExtensions } from './config';

const PORT = 1234;

const server = new Server({
  port: PORT,
  name: 'Collaboration CRDT Server',
  debounce: 1000,

  async onAuthenticate({ token, documentName: endpoint, connectionConfig }) {
    const service = new APIService<Permission>(`/permissions/${endpoint}`);

    try {
      const resp = await service
        .get({
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch((error) => error);
      if (!resp || resp.permission === 'UNAUTHORIZED') {
        connectionConfig.isAuthenticated = false;
        console.warn(`Unauthorized access attempt: ${endpoint}`);
        return { token, permission: 'UNAUTHORIZED' };
      }

      connectionConfig.isAuthenticated = true;
      return { token, permission: resp.permission };
    } catch {
      console.error('Authentication failed');
      connectionConfig.isAuthenticated = false;
      return { token, permission: 'UNAUTHORIZED' };
    }
  },

  async beforeHandleMessage({ documentName, context, connection }) {
    const { permission } = context;
    if (permission === 'READ_ONLY' || permission === 'UNAUTHORIZED') {
      console.warn(
        `Blocked unauthorized edit attempt on "${documentName}" (${permission})`
      );
      connection.readOnly = true;
    }
  },

  async onLoadDocument({ documentName: endpoint, context }) {
    const service = new APIService<Content>(`/${endpoint}/content`);

    try {
      const res = await service
        .get({
          headers: { Authorization: `Bearer ${context.token}` },
        })
        .catch((error) => console.log(error));

      const content = res?.content;
      if (!content) return new Doc();

      const json = JSON.parse(content);
      return TiptapTransformer.toYdoc(json, 'default', serverExtensions as any);
    } catch (err) {
      console.error(`Failed to load document "${endpoint}": ${err}`);
      return new Doc();
    }
  },

  async onStoreDocument({ documentName: endpoint, document, context }) {
    const { token } = context;

    const service = new APIService<Content>(`/${endpoint}/content`);
    const jsonContent = JSON.stringify(
      TiptapTransformer.fromYdoc(document).default
    );

    await service
      .put(
        { content: jsonContent },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .catch((error) => error);

    try {
      const res = await service
        .get({
          headers: { Authorization: `Bearer ${context.token}` },
        })
        .catch((error) => console.log(error));

      const content = res?.content;
      if (!content) return new Doc();

      const json = JSON.parse(content);
      return TiptapTransformer.toYdoc(json, 'default', serverExtensions as any);
    } catch (err) {
      console.error(`Failed to load document "${endpoint}": ${err}`);
      return new Doc();
    }
  },
});

server.listen();
