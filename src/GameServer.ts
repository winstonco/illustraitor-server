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
      socket.data.lobbyName = lobbyName;
      socket.join(lobbyName);
      return true;
    }
    return false;
  }

  leaveLobby(socket: GameSocket): boolean {
    if (this.isInALobby(socket)) {
      // in a lobby
      this.lobbies[socket.data.lobbyIndex!].removePlayer(socket.id);
      socket.leave(this.lobbies[socket.data.lobbyIndex!].name);
      socket.data.lobbyIndex = undefined;
      socket.data.lobbyName = undefined;
    }
    return true;
  }

  async startGame(
    lobbyName: string,
    turnTime: number = settings.turnLength
  ): Promise<void> {
    // Lobby must be defined
    const lobby: Lobby | undefined = this.getLobby(lobbyName);
    if (lobby !== undefined) {
      // All players have 3 seconds to show connection
      if (!(await this.readyCheck(lobbyName, 3000))) {
        // handle fail
      }
      this.to(lobbyName).emit('startGame');
      console.log('Game starting');

      // While playing:
      // Generate a prompt
      let prompt: string = genPrompt();
      // Randomly select an imposter artist
      let imposter: string = lobby.pickOne();
      this.to(lobbyName).except(imposter).emit('role', 'real');
      this.to(imposter).emit('role', 'imposter');
      console.log('Roles sent');
      // Randomly generate turn order
      let ordered: string[] = lobby.genOrdered();
      // Send prompt
      this.to(lobbyName).except(imposter).emit('prompt', prompt);
      console.log('Prompt sent');
      // All players take a turn
      for (let i = 0; i < ordered.length; i++) {
        const currentPlayer: GameSocket | undefined = this.of('/').sockets.get(
          ordered[i]
        );
        if (currentPlayer !== undefined) {
          await this.playTurn(currentPlayer, turnTime);
        }
      }
      if (settings.clearOnEnd) {
        this.to(lobbyName).emit('clearCanvas');
      }
      console.log('Game end');
    }
  }

  private async playTurn(player: GameSocket, turnTime: number): Promise<void> {
    return new Promise(async (res) => {
      console.log(`It is player ${player.id}'s turn`);
      player.data.canDraw = true;
      this.to(player.id).emit('startTurn', turnTime);
      await Timer.wait(turnTime, () => {
        player.data.canDraw = false;
        this.to(player.id).emit('endTurn');
        // Next turn
        console.log(`Player ${player.id}'s turn ended`);
        res();
      });
    });
  }

  readyCheck(lobbyName: string, delay: number): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
      this.to(lobbyName)
        .timeout(delay)
        .emit('readyCheck', (err: Error | null, responses: 'ok') => {
          if (err) {
            console.error(`Some players failed the ready check`);
            rej('Player(s) failed the ready check');
          } else {
            console.log(responses);
            console.log(`All players are ready!`);
            res(true);
          }
        });
    });
  }

  drop(socket: GameSocket): void {
    this.leaveLobby(socket);
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
