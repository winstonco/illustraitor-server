// https://socket.io/docs/v4/typescript/

import { Socket } from 'socket.io';

import IGlobalGameEvents from './GlobalGameEvents.js';
import { GameRole } from './GameRole.js';

interface ServerToClientEvents extends IGlobalGameEvents {
  readyCheck: (callback: (err: Error, responses: 'ok') => void) => void;
  role: (role: GameRole) => void;
  prompt: (prompt: string) => void;
  startTurn: () => void;
  endTurn: () => void;
  startGame: () => void;
}

interface ClientToServerEvents extends IGlobalGameEvents {
  hello: () => void;
  createLobby: (lobbyName: string, lobbySize?: number) => void;
  joinLobby: (lobbyName: string) => void;
  leaveLobby: (lobbyName: string) => void;
  startGame: (lobbyName: string) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  lobbyIndex: number;
  canDraw: boolean;
  name: string;
}

export {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
};

export interface GameSocket
  extends Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  > {}
