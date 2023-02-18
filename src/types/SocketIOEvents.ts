// https://socket.io/docs/v4/typescript/

import IGlobalGameEvents from './GlobalGameEvents.js';
import { GameRole } from './GameRole.js';
import GameSettings from './GameSettings.js';

type ResponseType = boolean;

interface ServerToClientEvents extends IGlobalGameEvents {
  readyCheck: (
    callback: (err: Error | null, res: { response: 'ok' }) => void
  ) => void;
  playersInLobby: (playerNames: string[]) => void;
  startGame: () => void;
  role: (role: GameRole) => void;
  imposterList: (imposterList: string[]) => void;
  prompt: (prompt: string) => void;
  startRound: () => void;
  startTurnAll: (currentPlayerName: string) => void;
  startTurn: (turnTime: number) => void;
  endTurn: () => void;
  guessImposter: (
    guessTime: number,
    callback: (err: Error | null, res: { guess: string }) => void
  ) => void;
  votingFinished: (majorityVote: { name: string; count: number }) => void;
  endRound: () => void;
  endGame: (impostersFound: string[], winners: GameRole) => void;
}

interface ClientToServerEvents extends IGlobalGameEvents {
  loaded: (lobbyName: string) => void;
  namePlayer: (
    lobbyName: string,
    name: string,
    callback: (response: ResponseType) => void
  ) => void;
  createLobby: (
    lobbyName: string,
    settings: GameSettings,
    callback: (response: ResponseType) => void,
    lobbySize?: number
  ) => void;
  joinLobby: (
    lobbyName: string,
    callback: (response: ResponseType) => void
  ) => void;
  leaveLobby: (callback: (response: ResponseType) => void) => void;
  startGame: (
    lobbyName: string,
    callback: (response: ResponseType) => void
  ) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  lobbyName: string;
  lobbyIndex: number;
  canDraw: boolean;
  name: string;
  role: GameRole;
}

export {
  ResponseType,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
};
