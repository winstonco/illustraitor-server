// Adapted from: https://blog.logrocket.com/how-to-set-up-node-typescript-express/
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';

import { ORIGIN, PORT } from './env-vars';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/socketio';
import { GameServer } from './GameServer';
import initSocket from './socketio';

const app: Express = express();
const httpServer = createServer(app);

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

httpServer.listen(PORT, () => {
  console.log(`[server]: Server is running at ${ORIGIN}`);
});

// Pass new Server object
initSocket(
  new GameServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: ORIGIN,
    },
  })
);
