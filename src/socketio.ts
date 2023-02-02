import { GameServer } from './GameServer.js';
import { ResponseType } from './types/SocketIOEvents.js';
import traceLog from './utils/traceLog.js';

// https://stackoverflow.com/questions/23653617/socket-io-listen-events-in-separate-files-in-node-js
export default function initSocket(io: GameServer) {
  io.on('connection', (socket) => {
    traceLog(1, 'connected', socket.id);

    const handleCreateLobby = (
      lobbyName: string,
      callback: (response: ResponseType) => void,
      size?: number
    ) => {
      traceLog(1, `Creating lobby ${lobbyName}`);
      if (io.createLobby(lobbyName, socket, size)) {
        traceLog(1, `Socket ${socket.id} created lobby ${lobbyName}`);
        callback(true);
      } else {
        traceLog(1, `Failed to create lobby ${lobbyName}`);
        callback(false);
      }
      traceLog(2, io.lobbies);
    };
    socket.on('createLobby', handleCreateLobby);

    const handleJoinLobby = (
      lobbyName: string,
      callback: (response: ResponseType) => void
    ) => {
      traceLog(1, `Joining lobby ${lobbyName}`);
      if (io.joinLobby(lobbyName, socket)) {
        traceLog(1, `Socket ${socket.id} joined lobby ${lobbyName}`);
        callback(true);
      } else {
        traceLog(1, `Socket ${socket.id} failed to join lobby ${lobbyName}`);
        callback(false);
      }
    };
    socket.on('joinLobby', handleJoinLobby);

    const handleNamePlayer = (
      lobbyName: string,
      name: string,
      callback: (response: ResponseType) => void
    ) => {
      if (io.lobbyHasName(lobbyName, name)) {
        callback(false);
      }
      socket.data.name = name;
      callback(true);
    };
    socket.on('namePlayer', handleNamePlayer);

    const handleLeaveLobby = (callback: (response: ResponseType) => void) => {
      const lobbyName = socket.data.lobbyName;
      if (lobbyName) {
        traceLog(1, `Leaving lobby ${lobbyName}`);
        if (io.leaveLobby(lobbyName, socket)) {
          traceLog(1, `Socket ${socket.id} left lobby ${lobbyName}`);
          callback(true);
        } else {
          traceLog(1, `Socket ${socket.id} failed to leave lobby ${lobbyName}`);
          callback(false);
        }
      }
    };
    socket.on('leaveLobby', handleLeaveLobby);

    socket.on(
      'startGame',
      async (lobbyName: string, callback: (response: ResponseType) => void) => {
        traceLog(1, `Starting game in lobby: ${lobbyName}`);
        if (await io.startGame(lobbyName)) {
          callback(true);
        } else {
          traceLog(1, `Failed to start game in lobby ${lobbyName}`);
          callback(false);
        }
      }
    );

    // Disconnect
    socket.on('disconnecting', (reason) => {
      traceLog(1, `Socket ${socket.id} disconnected`);
      io.dropSocket(socket);
    });
  });
}
