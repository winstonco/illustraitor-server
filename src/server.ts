// Adapted from: https://blog.logrocket.com/how-to-set-up-node-typescript-express/
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';

import { ORIGIN, PORT } from './envVars.js';
import { GameServer } from './GameServer.js';
import initSocket from './socketio.js';

const app: Express = express();
const httpServer = createServer(app);

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

httpServer.listen(PORT, () => {
  console.log(`[server]: Server is running on port ${PORT}`);
});

// Pass new Server object
initSocket(
  new GameServer(httpServer, {
    cors: {
      origin: ORIGIN,
    },
  })
);
