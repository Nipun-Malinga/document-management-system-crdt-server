import { Server } from '@hocuspocus/server';

const server = new Server({
  port: 1234,
  name: 'Collaboration CRDT Server',
  debounce: 3000,
});

server.listen();
