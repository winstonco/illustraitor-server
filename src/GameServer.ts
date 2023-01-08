import { Server, Socket } from 'socket.io';

import {
  ClientToServerEvents,
  GameSocket,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/SocketIOEvents.js';
import Lobby from './Lobby.js';
import { DrawEvents } from './types/EventNames.js';
import genPrompt from './utils/genPrompt.js';
import Timer from './utils/Timer.js';
import { settings } from './settings.js';

export class GameServer extends Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> {
  public lobbies: Lobby[];
  public count: number;

  constructor(...args: any[]) {
    super(...args);
    this.lobbies = new Array<Lobby>();
    this.count = 0;
  }

  createLobby(lobbyName: string, size?: number): boolean {
    if (this.getLobby(lobbyName) === undefined) {
      this.lobbies.push(new Lobby(lobbyName, size));
      return true;
    }
    return false;
  }

  joinLobby(lobbyName: string, socket: GameSocket): boolean {
    const lobby = this.getLobby(lobbyName);
    if (!this.isInALobby(socket) && lobby?.addPlayer(socket.id)) {
      socket.data.lobbyIndex = this.lobbies.indexOf(lobby);
      socket.data.canDraw = settings.startCanDraw;
      socket.join(lobbyName);
      return true;
    }
    return false;
  }

  leaveLobby(lobbyName: string, socket: GameSocket): boolean {
    if (this.getLobby(lobbyName)?.removePlayer(socket.id)) {
      socket.data.lobbyIndex = undefined;
      socket.leave(lobbyName);
      return true;
    }
    return false;
  }

  startGame(lobbyName: string, turnTime: number = settings.turnLength): void {
    // Lobby must be defined
    const lobby: Lobby | undefined = this.getLobby(lobbyName);
    if (lobby !== undefined) {
      // All players have 3 seconds to show connection
      this.readyCheck(lobbyName, 3000);
      this.to(lobbyName).emit('startGame');

      // While playing:
      // Generate a prompt
      let prompt: string = genPrompt();
      // Randomly select an imposter artist
      let imposter: string = lobby.pickOne();
      this.to(lobbyName).except(imposter).emit('role', 'real');
      this.to(imposter).emit('role', 'imposter');
      // Randomly generate turn order
      let ordered: string[] = lobby.genOrdered();
      // Send prompt
      this.to(lobbyName).except(imposter).emit('prompt', prompt);
      // All players take a turn
      ordered.forEach(async (playerId) => {
        const currentPlayer: GameSocket | undefined =
          this.of('/').sockets.get(playerId);
        if (currentPlayer !== undefined) {
          await this.playTurn(currentPlayer, turnTime);
        }
      });
    }
  }

  private async playTurn(player: GameSocket, turnTime: number): Promise<void> {
    player.data.canDraw = true;
    this.to(player.id).emit('startTurn');
    await Timer.wait(turnTime);
    player.data.canDraw = false;
    this.to(player.id).emit('endTurn');
    // Next turn
  }

  readyCheck(lobbyName: string, delay: number): void {
    this.to(lobbyName)
      .timeout(delay)
      .emit('readyCheck', (err: Error, responses: 'ok') => {
        if (err) {
          console.error(`Some players failed the ready check`);
        } else {
          console.log(responses);
          console.log(`All players are ready!`);
        }
      });
  }

  drop(socket: GameSocket): void {
    // Handle disconnects
    const lobbyIndex = socket.data.lobbyIndex;
    if (lobbyIndex !== undefined) {
      const lobbyName = this.lobbies[lobbyIndex];
      this.leaveLobby(lobbyName.name, socket);
    }
  }

  updateDrawEvents(socket: GameSocket): void {
    DrawEvents.forEach((ev: DrawEvents) => {
      socket.removeAllListeners(ev);
      socket.on(ev, (...args: any[]) => {
        if (socket.data.canDraw) {
          this.reEmit(socket, ev, ...args);
        }
      });
    });
  }

  isInALobby(socket: GameSocket): boolean {
    return socket.data.lobbyIndex !== undefined;
  }

  private reEmit(socket: Socket, ev: string, ...args: any[]): void {
    const lobbyIndex = socket.data.lobbyIndex;
    let lobbyName = socket.id;
    if (lobbyIndex !== undefined) {
      lobbyName = this.lobbies[lobbyIndex].name;
    }
    socket.to(lobbyName).emit(ev, ...args);
  }

  private getLobby(lobbyName: string) {
    return this.lobbies.find((lobby) => lobby.name === lobbyName);
  }
}
