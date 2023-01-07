import { Server, Socket } from 'socket.io';
import { DefaultEventsMap, EventsMap } from 'socket.io/dist/typed-events';

import { Lobby } from './Lobby';
import { DrawEvents, GameEvents } from './types/GameEvents';

export class GameServer<
  ListenEvents extends EventsMap = DefaultEventsMap,
  EmitEvents extends EventsMap = ListenEvents,
  ServerSideEvents extends EventsMap = DefaultEventsMap,
  SocketData = any
> extends Server {
  public lobbies: Lobby[];
  public count: number;

  // Map of sockets in a lobby to the index of the lobby
  private _savedSockets: Map<Socket, number>;

  constructor(...args: any[]) {
    super(...args);
    this.lobbies = new Array<Lobby>();
    this.count = 0;

    this._savedSockets = new Map<Socket, number>();
  }

  createLobby(name: string, size?: number): boolean {
    if (this.lobbies.find((lobby) => lobby.name === name) === undefined) {
      this.lobbies.push(new Lobby(name, size));
      return true;
    }
    return false;
  }

  joinLobby(name: string, socket: Socket): boolean {
    let lobby = this.lobbies.find((lobby) => lobby.name === name);
    if (!this.isInALobby(socket) && lobby?.addPlayer(socket.id)) {
      this._savedSockets.set(socket, this.lobbies.indexOf(lobby));
      socket.join(name);
      return true;
    }
    return false;
  }

  leaveLobby(name: string, socket: Socket): boolean {
    if (
      this.lobbies.find((lobby) => lobby.name === name)?.removePlayer(socket.id)
    ) {
      this._savedSockets.delete(socket);
      socket.leave(name);
      return true;
    }
    return false;
  }

  startGame(name: string): void {
    this.readyCheck(3000, name);
  }

  readyCheck(delay: number, name: string): void {
    this.to(name)
      .timeout(delay)
      .emit('ready', (err: Error, responses: 'ok') => {
        if (err) {
          console.error('Error: Some players failed the ready check');
        } else {
          console.log('All players are ready');
        }
      });
  }

  updateDrawEvents(socket: Socket): void {
    DrawEvents.forEach((ev: DrawEvents) => {
      socket.removeAllListeners(ev);
      socket.on(ev, this.reEmitListener(ev, socket));
    });
  }

  private reEmitListener(
    ev: GameEvents,
    socket: Socket
  ): (...args: any[]) => void {
    const lobbyIndex = this._savedSockets.get(socket);
    let lobbyName = socket.id;
    if (lobbyIndex !== undefined) {
      lobbyName = this.lobbies[lobbyIndex].name;
    }
    return (...args: any[]) => {
      socket.to(lobbyName).emit(ev, ...args);
    };
  }

  isInALobby(socket: Socket): boolean {
    return this._savedSockets.has(socket);
  }
}

export class GameSocket {
  socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  joinLobby(): void {}

  reEmit(ev: GameEvents): void {
    this.socket.on(ev, (...args) => {
      this.socket.broadcast.emit(ev, ...args);
    });
  }
}
