import { Server } from 'socket.io';

import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/SocketIOEvents.js';
import Lobby from './Lobby.js';
import genPrompt from './utils/genPrompt.js';
import { settings } from './settings.js';
import GameSocket from './GameSocket.js';
import { DrawEvents } from './types/EventNames.js';
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
    console.log(lobbyName);
    const lobby = this.getLobby(lobbyName);
    console.log(lobby);
    // Leaves any lobby they were in first
    if (socket.data.lobbyName) this.leaveLobby(socket.data.lobbyName, socket);
    if (lobby?.addPlayer(socket)) {
      this.outOfGameSetup(socket);
      socket.data.lobbyIndex = this.lobbies.indexOf(lobby);
      socket.data.lobbyName = lobbyName;
      socket.join(lobbyName);
      return true;
    }
    return false;
  }

  lobbyHasName(lobbyName: string, nameToAdd: string): boolean {
    const lobby = this.getLobby(lobbyName);
    if (lobby) return lobby.containsName(nameToAdd);
    return false;
  }

  leaveLobby(lobbyName: string, socket: GameSocket): boolean {
    const lobby = this.getLobby(lobbyName);
    if (!lobby) return false;
    if (!lobby.contains(socket)) return false;
    lobby.removePlayer(socket);
    socket.leave(lobby.name);
    if (lobby.isEmpty()) this.removeLobby(lobby);
    socket.data.lobbyIndex = undefined;
    socket.data.lobbyName = undefined;
    this.updateDrawEvents(socket);
    return true;
  }

  leaveAll(socket: GameSocket) {
    if (socket.data.lobbyIndex && this.lobbies[socket.data.lobbyIndex]) {
      const lobby = this.lobbies[socket.data.lobbyIndex];
      lobby.removePlayer(socket);
      socket.leave(this.lobbies[socket.data.lobbyIndex].name);
      if (lobby.isEmpty()) {
        this.removeLobby(lobby);
      }
      socket.data.lobbyIndex = undefined;
      socket.data.lobbyName = undefined;
    }
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
    const imposter: string = lobby.pickOneRandom().id;
    this.to(lobbyName).except(imposter).emit('role', 'real');
    this.to(imposter).emit('role', 'imposter');
    console.log('Roles sent');
    // Randomly generate turn order
    let ordered: GameSocket[] = lobby.genRandomOrdered();
    // Send prompt
    this.to(lobbyName).except(imposter).emit('prompt', prompt);
    this.to(imposter).emit(
      'prompt',
      "You can't see the prompt. Try to blend in!"
    );
    console.log('Prompt sent');
    // All players take a turn
    for (let i = 0; i < ordered.length; i++) {
      const currentPlayer: GameSocket = ordered[i];
      if (currentPlayer && currentPlayer.data.name) {
        this.to(lobbyName).emit('startTurnAll', currentPlayer.data.name);
        await this.playTurn(currentPlayer, turnTime);
      }
    }
    if (settings.clearOnEnd) {
      this.to(lobbyName).emit('clearCanvas');
    }
    // Guess who is imposter
    const sockets = this.getLobby(lobbyName)?.sockets;
    const responses: string[] = [];
    await new Promise<boolean>((resolve) => {
      sockets?.forEach(async (socket) => {
        socket.emit('guessImposter', settings.timeToGuess, (err, res) => {
          responses.push(res.guess);
          if (responses.length === sockets.length) resolve(true);
        });
      });
    });

    console.log(responses);
    console.log('Game end');
    this.to(lobbyName).emit('endGame');
    // Post-game
    this.postGame(lobby);
  }

  private async playTurn(player: GameSocket, turnTime: number): Promise<void> {
    return new Promise(async (res) => {
      console.log(`It is player ${player.id}'s turn`);
      player.data.canDraw = true;
      this.to(player.id).emit('startTurn', turnTime);
      setTimeout(() => {
        player.data.canDraw = false;
        this.to(player.id).emit('endTurn');
        // Next turn
        console.log(`Player ${player.id}'s turn ended`);
        res();
      }, turnTime * 1000);
    });
  }

  readyCheck(lobbyName: string, delay: number): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const sockets = this.getLobby(lobbyName)?.sockets;
      const numSockets = sockets?.length;
      let numResponses = 0;

      sockets?.forEach((socket) => {
        socket
          .timeout(delay)
          .emit('readyCheck', (err: Error | null, res: { response: 'ok' }) => {
            if (err) {
              console.error(`A player failed the ready check`);
              reject('Player(s) failed the ready check');
            } else {
              if (++numResponses === numSockets) {
                console.log(`All players are ready!`);
                resolve(true);
              }
            }
          });
      });
    });
  }

  dropSocket(socket: GameSocket): void {
    this.leaveAll(socket);
  }

  updateDrawEvents(socket: GameSocket) {
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

  /**
   * @param lobbyName The name of the lobby to find
   * @returns true if a lobby with that name is found.
   */
  private getLobby(lobbyName: string) {
    return this.lobbies.find((lobby) => lobby.name === lobbyName);
  }
}
