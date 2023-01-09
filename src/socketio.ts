import { GameServer } from './GameServer.js';
import { ClientToServerEvents } from './types/SocketIOEvents.js';

// https://stackoverflow.com/questions/23653617/socket-io-listen-events-in-separate-files-in-node-js
export default function initSocket(io: GameServer) {
  io.on('connection', (socket) => {
    console.log('connected', socket.id);

    const handleCreate = (
      lobbyName: string,
      callback: (response: 'ok' | 'fail') => void,
      size?: number
    ) => {
      console.log(`Creating lobby ${lobbyName}`);
      if (io.createLobby(lobbyName, socket, size)) {
        console.log(`Lobby ${lobbyName} created`);
        handleJoin(lobbyName, (res) => {
          callback(res);
        });
      } else {
        console.log(`Failed to create lobby ${lobbyName}`);
        callback('fail');
      }
    };
    socket.on('createLobby', handleCreate);

    const handleJoin = (
      lobbyName: string,
      callback: (response: 'ok' | 'fail') => void
    ) => {
      console.log(`Joining lobby ${lobbyName}`);
      if (io.joinLobby(lobbyName, socket)) {
        io.updateDrawEvents(socket);
        console.log(`Socket ${socket.id} joined lobby ${lobbyName}`);
        callback('ok');
      } else {
        console.log(`Socket ${socket.id} failed to join lobby ${lobbyName}`);
        callback('fail');
      }
    };
    socket.on('joinLobby', handleJoin);

    const handleLeave = (callback: (response: 'ok' | 'fail') => void) => {
      const lobbyName = socket.data.lobbyName;
      if (lobbyName) {
        console.log(`Leaving lobby ${lobbyName}`);
        if (io.leaveLobby(lobbyName, socket)) {
          io.updateDrawEvents(socket);
          console.log(`Socket ${socket.id} left lobby ${lobbyName}`);
          callback('ok');
        } else {
          console.log(`Socket ${socket.id} failed to leave lobby ${lobbyName}`);
          callback('fail');
        }
      }
    };
    socket.on('leaveLobby', handleLeave);

    socket.on('startGame', (lobbyName: string) => {
      console.log(`Starting game in lobby: ${lobbyName}`);
      io.startGame(lobbyName);
    });

    // Disconnect
    socket.on('disconnecting', (reason) => {
      console.log(`Socket ${socket.id} disconnected`);
      io.dropSocket(socket);
    });
  });
}
