import { Server } from 'socket.io';

import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/SocketIOEvents.js';
import Lobby from './Lobby.js';
import genPrompt from './utils/genPrompt.js';
import { settings } from './envVars.js';
import GameSocket from './GameSocket.js';
import { DrawEvents } from './types/EventNames.js';
import { DrawEventArgs } from './types/DrawEvents.js';
import traceLog from './utils/traceLog.js';

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
    traceLog(2, `GameServer.ts:31 -- removeLobby(${lobby.name})`);
    if (this.lobbies.includes(lobby)) {
      this.lobbies = this.lobbies.filter((checkLobby) => {
        return checkLobby !== lobby;
      });
      return true;
    }
    return false;
  }

  createLobby(lobbyName: string, socket: GameSocket, size?: number): boolean {
    traceLog(2, `GameServer.ts:42 -- createLobby(${lobbyName}, ...)`);
    if (this.getLobby(lobbyName) === undefined) {
      this.lobbies.push(new Lobby(lobbyName, size));
      return true;
    }
    return false;
  }

  joinLobby(lobbyName: string, socket: GameSocket): boolean {
    traceLog(2, `GameServer.ts:51 -- joinLobby(${lobbyName}, ...)`);
    const lobby = this.getLobby(lobbyName);
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
    traceLog(2, `GameServer.ts:72 -- leaveLobby(${lobbyName}, ...)`);
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

  private async preGame(lobby: Lobby) {
    traceLog(1, 'Pre game');
    traceLog(2, 'Ready check');
    // All players have up to 3 seconds to show connection
    if (!(await this.readyCheck(lobby.name, 3000))) {
      traceLog(2, 'Failed ready check');
      // handle fail
    }
    traceLog(2, `Players in lobby: ${lobby.playerNames}`);
    this.to(lobby.name).emit('playersInLobby', lobby.playerNames);
  }

  private postGame(lobby: Lobby) {
    traceLog(1, 'Post game');
    lobby.sockets.forEach((socket) => this.outOfGameSetup(socket));
  }

  async startGame(
    lobbyName: string,
    turnTime: number = settings.turnLength
  ): Promise<boolean> {
    traceLog(2, `GameServer.ts:113 -- startGame(${lobbyName}, ...)`);
    // Lobby must be defined
    const lobby: Lobby | undefined = this.getLobby(lobbyName);
    if (lobby === undefined) return false;
    if (lobby.size < settings.minimumPlayers) return false;
    // Pre-game
    this.preGame(lobby);
    this.to(lobbyName).emit('startGame');
    traceLog(1, 'Game starting');

    // While playing:
    // Generate a prompt
    const prompt: string = genPrompt();
    traceLog(1, prompt);
    // Randomly select an imposter artist
    const imposter: GameSocket = lobby.pickOneRandom();
    this.to(lobbyName).except(imposter.id).emit('role', 'real');
    this.to(imposter.id).emit('role', 'imposter');
    traceLog(1, 'Roles sent');
    // Randomly generate turn order
    let ordered: GameSocket[] = lobby.genRandomOrdered();
    // Send prompt
    this.to(lobbyName).except(imposter.id).emit('prompt', prompt);
    this.to(imposter.id).emit(
      'prompt',
      "You can't see the prompt. Try to blend in!"
    );
    traceLog(1, 'Prompt sent');
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
    let numResponses = 0;
    const responseCounts: { [name: string]: number } = {};
    await new Promise<boolean>((resolve) => {
      sockets?.forEach(async (socket) => {
        socket.emit('guessImposter', settings.timeToGuess, (err, res) => {
          console.log(res);
          if (responseCounts[res.guess]) responseCounts[res.guess]++;
          else responseCounts[res.guess] = 1;
          numResponses++;
          if (numResponses === sockets.length) resolve(true);
        });
      });
    });

    const majorityVote = Object.entries(responseCounts).reduce(
      (majority, current) => (current[1] > majority[1] ? current : majority)
    );

    traceLog(1, responseCounts);
    traceLog(2, majorityVote);
    this.to(lobbyName).emit('votingFinished', {
      name: majorityVote[0],
      count: majorityVote[1],
    });
    traceLog(1, 'Game end');
    if (majorityVote[0] === imposter.data.name) {
      traceLog(1, 'The imposter was found');
      this.to(lobbyName).emit('endGame', true);
    } else {
      traceLog(1, 'The imposter got away');
      this.to(lobbyName).emit('endGame', false);
    }

    // Post-game
    this.postGame(lobby);
    return true;
  }

  private async playTurn(player: GameSocket, turnTime: number): Promise<void> {
    return new Promise(async (res) => {
      traceLog(1, `It is player ${player.id}'s turn`);
      player.data.canDraw = true;
      this.to(player.id).emit('startTurn', turnTime);
      setTimeout(() => {
        player.data.canDraw = false;
        this.to(player.id).emit('endTurn');
        // Next turn
        traceLog(1, `Player ${player.id}'s turn ended`);
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
              traceLog(
                1,
                `Lobby: ${lobbyName} -- A player failed the ready check`
              );
              resolve(false);
            } else {
              if (++numResponses === numSockets) {
                traceLog(1, `Lobby: ${lobbyName} -- All players are ready`);
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
