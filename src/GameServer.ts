import { Server } from 'socket.io';

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
import { DrawEventArgs } from './types/DrawEvents.js';

export class GameServer extends Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> {
  public lobbies: Lobby[];

  constructor(...args: any[]) {
    super(...args);
    this.lobbies = new Array<Lobby>();
  }

  removeLobby(lobby: Lobby): boolean {
    if (this.lobbies.includes(lobby)) {
      this.lobbies = this.lobbies.filter((l) => {
        return l !== lobby;
      });
      return true;
    }
    return false;
  }

  createLobby(lobbyName: string, socket: GameSocket, size?: number): boolean {
    if (this.getLobby(lobbyName) === undefined) {
      this.lobbies.push(new Lobby(lobbyName, size));
      this.joinLobby(lobbyName, socket);
      return true;
    }
    return false;
  }

  joinLobby(lobbyName: string, socket: GameSocket): boolean {
    // Leaves any lobby they were in first
    const lobby = this.getLobby(lobbyName);
    if (lobby) {
      if (this.isInALobby(socket)) {
        this.leaveLobby(socket.data.lobbyName!, socket);
      }
      if (lobby.addPlayer(socket)) {
        this.outOfGameSetup(socket);
        socket.data.lobbyIndex = this.lobbies.indexOf(lobby);
        socket.data.lobbyName = lobbyName;
        socket.join(lobbyName);
        return true;
      }
    }
    return false;
  }

  leaveLobby(lobbyName: string, socket: GameSocket): boolean {
    const lobby = this.getLobby(lobbyName);
    if (lobby?.contains(socket)) {
      lobby.removePlayer(socket);
      socket.leave(lobby.name);
      if (lobby.isEmpty()) {
        this.removeLobby(lobby);
      }
      socket.data.lobbyIndex = undefined;
      socket.data.lobbyName = undefined;
      this.updateDrawEvents(socket);
      return true;
    }
    return false;
  }

  leaveAll(socket: GameSocket): boolean {
    if (this.isInALobby(socket)) {
      // in a lobby
      const lobby: Lobby = this.lobbies[socket.data.lobbyIndex!];
      lobby.removePlayer(socket);
      socket.leave(this.lobbies[socket.data.lobbyIndex!].name);
      if (lobby.isEmpty()) {
        this.removeLobby(lobby);
      }
      socket.data.lobbyIndex = undefined;
      socket.data.lobbyName = undefined;
    }
    return true;
  }

  private outOfGameSetup(socket: GameSocket) {
    this.updateDrawEvents(socket);
    socket.data.canDraw = settings.outOfGameDrawEnabled;
  }

  private preGame(lobby: Lobby) {}

  private postGame(lobby: Lobby) {
    lobby.sockets.forEach((socket) => this.outOfGameSetup(socket));
  }

  async startGame(
    lobbyName: string,
    turnTime: number = settings.turnLength
  ): Promise<void> {
    // Lobby must be defined
    const lobby: Lobby | undefined = this.getLobby(lobbyName);
    if (lobby === undefined) return;
    // Pre-game
    this.preGame(lobby);
    // All players have up to 3 seconds to show connection
    if (!(await this.readyCheck(lobbyName, 3000))) {
      // handle fail
    }
    this.to(lobbyName).emit('startGame');
    console.log('Game starting');

    // While playing:
    // Generate a prompt
    const prompt: string = genPrompt();
    console.log(prompt);
    // Randomly select an imposter artist
    const imposter: string = lobby.pickOne().id;
    this.to(lobbyName).except(imposter).emit('role', 'real');
    this.to(imposter).emit('role', 'imposter');
    console.log('Roles sent');
    // Randomly generate turn order
    let ordered: GameSocket[] = lobby.genOrdered();
    // Send prompt
    this.to(lobbyName).except(imposter).emit('prompt', prompt);
    console.log('Prompt sent');
    // All players take a turn
    for (let i = 0; i < ordered.length; i++) {
      const currentPlayer: GameSocket = ordered[i];
      if (currentPlayer) await this.playTurn(currentPlayer, turnTime);
    }
    if (settings.clearOnEnd) {
      this.to(lobbyName).emit('clearCanvas');
    }
    console.log('Game end');
    // Post-game
    this.postGame(lobby);
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

  dropSocket(socket: GameSocket): void {
    this.leaveAll(socket);
  }

  updateDrawEvents(socket: GameSocket): void {
    DrawEvents.forEach((ev: DrawEvents) => {
      socket.removeAllListeners(ev);
      socket.on(ev, (...args: DrawEventArgs) => {
        if (socket.data.canDraw) {
          let lobbyName = socket.data.lobbyName ?? socket.id;
          socket.to(lobbyName).emit(ev, ...args);
        }
      });
    });
  }

  isInALobby(socket: GameSocket): boolean {
    return socket.data.lobbyIndex !== undefined;
  }

  private getLobby(lobbyName: string) {
    return this.lobbies.find((lobby) => lobby.name === lobbyName);
  }
}
