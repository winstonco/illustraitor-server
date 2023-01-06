// From: https://blog.logrocket.com/how-to-set-up-node-typescript-express/

import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { PORT } from './env-vars';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/socketio';
import { Server } from 'socket.io';

const app: Express = express();
const httpServer = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
  },
});

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

httpServer.listen(PORT, () => {
  console.log(`[server]: Server is running at http://localhost:${PORT}`);
});

// https://socket.io/docs/v4/typescript/

io.on('connection', (socket) => {
  console.log('connected');
  socket.on('hello', () => {
    console.log('world');
  });

  // Draw events
  socket.on('beginDrawing', (startX, startY) => {
    socket.broadcast.emit('beginDrawing', startX, startY);
  });
  socket.on('drawTo', (toX, toY, width) => {
    socket.broadcast.emit('drawTo', toX, toY, width);
  });
  socket.on('endDrawing', () => {
    socket.broadcast.emit('endDrawing');
  });
  socket.on('clearCanvas', () => {
    socket.broadcast.emit('clearCanvas');
  });
});
