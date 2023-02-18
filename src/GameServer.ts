import { Server } from 'socket.io';

import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/SocketIOEvents.js';
import Lobby from './Lobby.js';
import genPrompt from './utils/genPrompt.js';
import { serverSettings } from './envVars.js';
import GameSocket from './types/GameSocket.js';
import { DrawEvents } from './types/EventNames.js';
import { DrawEventArgs } from './types/DrawEvents.js';
import traceLog from './utils/traceLog.js';
import GameSettings from './types/GameSettings.js';

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

  createLobby(
    lobbyName: string,
    settings: GameSettings,
    socket: GameSocket,
    size?: number
  ): boolean {
    traceLog(2, `GameServer.ts:42 -- createLobby(${lobbyName}, ...)`);
    if (this.getLobby(lobbyName) === undefined) {
      this.lobbies.push(new Lobby(lobbyName, size, settings));
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
      this.updateNameList(lobbyName);
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
    this.to(lobby.name).emit('playersInLobby', lobby.playerNames);
    return true;
  }

  leaveAll(socket: GameSocket) {
    if (socket.data.lobbyIndex && this.lobbies[socket.data.lobbyIndex]) {
      const lobby = this.lobbies[socket.data.lobbyIndex];
      lobby.removePlayer(socket);
      socket.leave(this.lobbies[socket.data.lobbyIndex].name);
      this.to(lobby.name).emit('playersInLobby', lobby.playerNames);
      if (lobby.isEmpty()) {
        this.removeLobby(lobby);
      }
      socket.data.lobbyIndex = undefined;
      socket.data.lobbyName = undefined;
    }
  }

  private outOfGameSetup(socket: GameSocket) {
    this.updateDrawEvents(socket);
    socket.data.canDraw = serverSettings.outOfGameDrawEnabled;
  }

  private async preGame(lobby: Lobby): Promise<boolean> {
    traceLog(1, 'Pre game');
    traceLog(2, 'Ready check');
    // All players have up to 3 seconds to show connection
    if (!(await this.readyCheck(lobby.name, 3000))) {
      traceLog(2, 'Failed ready check');
      return false;
    }
    this.updateNameList(lobby.name);
    lobby.resetRoles();
    return true;
  }

  private postGame(lobby: Lobby) {
    traceLog(1, 'Post game');
    lobby.sockets.forEach((socket) => this.outOfGameSetup(socket));
  }

  private sendRoles(lobby: Lobby) {
    // Send roles
    lobby.sockets.forEach((socket) => {
      // To reals
      if (socket.data.role === 'real') {
        this.to(socket.id).emit('role', 'real');
      }
      // To imposters
      else if (socket.data.role === 'imposter') {
        this.to(socket.id).emit('role', 'imposter');
        this.to(socket.id).emit('imposterList', lobby.imposterNames);
      }
    });
    traceLog(1, 'Roles sent');
  }

  private sendPrompts(lobby: Lobby) {
    // Generate prompts
    const realPrompt: string = genPrompt();
    const imposterPrompt = "You can't see the prompt. Try to blend in!";
    // Send prompts
    lobby.sockets.forEach((socket) => {
      // To reals
      if (socket.data.role === 'real') {
        this.to(socket.id).emit('prompt', realPrompt);
      }
      // To imposters
      else if (socket.data.role === 'imposter') {
        this.to(socket.id).emit('prompt', imposterPrompt);
      }
    });
    traceLog(1, 'Prompt sent');
  }

  private playTurn(player: GameSocket, turnTime: number): Promise<void> {
    return new Promise((res) => {
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

  private async playDrawPhase(lobby: Lobby) {
    // Randomly generate turn order
    let ordered: GameSocket[] = lobby.genRandomOrdered();
    // All players take a turn
    // Note: don't use forEach because it doesn't work well with async/await
    for (let i = 0; i < ordered.length; i++) {
      const currentPlayer = ordered[i];
      await new Promise<void>(async (res) => {
        if (currentPlayer && currentPlayer.data.name) {
          this.to(lobby.name).emit('startTurnAll', currentPlayer.data.name);
          await this.playTurn(currentPlayer, lobby.settings['Turn Length']);
          res();
        }
      });
    }
    if (serverSettings.clearOnEnd) {
      this.to(lobby.name).emit('clearCanvas');
    }
  }

  private async playGuessPhase(lobby: Lobby): Promise<GameSocket | undefined> {
    // Guess who is imposter
    const sockets = this.getLobby(lobby.name)?.sockets;
    let numResponses = 0;
    const responseCounts: { [name: string]: number } = {};
    await new Promise<boolean>((resolve) => {
      sockets?.forEach((socket) => {
        socket.emit(
          'guessImposter',
          lobby.settings['Guess Time'],
          (err, res) => {
            traceLog(2, `${socket.data.name} voted for ${res.guess}`);
            if (responseCounts[res.guess]) responseCounts[res.guess]++;
            else responseCounts[res.guess] = 1;
            numResponses++;
            if (numResponses === sockets.length) resolve(true);
          }
        );
      });
    });

    const majorityVoteName = Object.keys(responseCounts).reduce(
      (majority, current) =>
        responseCounts[current] > responseCounts[majority] ? current : majority
    );
    traceLog(1, responseCounts);
    traceLog(2, `Majority voted name: ${majorityVoteName}`);
    this.to(lobby.name).emit('votingFinished', {
      name: majorityVoteName,
      count: responseCounts[majorityVoteName],
    });

    return lobby.getSocketByName(majorityVoteName);
  }

  private async pausePhase(secondsPaused: number) {
    traceLog(1, 'Paused');
    return new Promise<void>((res) => {
      setTimeout(() => {
        traceLog(1, 'Unpaused');
        res();
      }, secondsPaused * 1000);
    });
  }

  async startGame(lobbyName: string): Promise<boolean> {
    traceLog(2, `GameServer.ts:113 -- startGame(${lobbyName}, ...)`);
    // Lobby must be defined
    const lobby: Lobby | undefined = this.getLobby(lobbyName);
    if (lobby === undefined) return false;
    if (lobby.size < serverSettings.minimumPlayers) return false;
    if (!(await this.preGame(lobby))) return false;

    // Start
    this.to(lobbyName).emit('startGame');
    traceLog(1, 'Game starting-----------------------');

    // Randomly select imposters
    const imposterCount = lobby.settings['Imposter Count'];
    lobby.pickImposters(imposterCount);
    lobby.sockets.forEach((socket) => console.log(socket.data.role));
    this.sendRoles(lobby);

    const impostersFound: GameSocket[] = [];

    // Rounds
    for (
      let roundCounter = 1;
      roundCounter <= lobby.settings['Number of Rounds'];
      roundCounter++
    ) {
      // Round start
      traceLog(1, `Round ${roundCounter} start`);
      this.to(lobby.name).emit('startRound');
      this.sendPrompts(lobby);
      // Guess phase
      traceLog(1, 'Draw phase');
      await this.playDrawPhase(lobby);
      traceLog(1, 'Guess phase');
      const majVoteSocket = await this.playGuessPhase(lobby);
      if (majVoteSocket) {
        if (
          lobby.imposters.includes(majVoteSocket) &&
          !impostersFound.includes(majVoteSocket)
        ) {
          traceLog(1, `${majVoteSocket.data.name} was an imposter`);
          impostersFound.push(majVoteSocket);
        } else {
          traceLog(1, `${majVoteSocket.data.name} was not an imposter`);
        }
      }
      traceLog(1, 'Voting finished, debriefing');
      await this.pausePhase(5);
      // Round end
      traceLog(1, `Round ${roundCounter} end`);
      this.to(lobby.name).emit('endRound');
      traceLog(1, 'End of round pause phase');
      await this.pausePhase(2);
    }
    const imposterNamesFound = impostersFound.map(
      (imposter) => imposter.data.name!
    );
    traceLog(2, `Imposters found: ${imposterNamesFound}`);
    traceLog(1, 'Game end');
    this.to(lobby.name).emit(
      'endGame',
      imposterNamesFound,
      impostersFound.length === imposterCount ? 'real' : 'imposter'
    );

    // Post-game
    this.postGame(lobby);
    return true;
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

  updateNameList(lobbyName: string) {
    const lobby: Lobby | undefined = this.getLobby(lobbyName);
    if (lobby === undefined) return;
    this.to(lobby.name).emit('playersInLobby', lobby.playerNames);
  }

  /**
   * @param lobbyName The name of the lobby to find
   * @returns true if a lobby with that name is found.
   */
  private getLobby(lobbyName: string) {
    return this.lobbies.find((lobby) => lobby.name === lobbyName);
  }
}
