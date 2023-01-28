import { GameServer } from './GameServer.js';

// https://stackoverflow.com/questions/23653617/socket-io-listen-events-in-separate-files-in-node-js
export default function initSocket(io: GameServer) {
  io.on('connection', (socket) => {
    console.log('connected', socket.id);

    const handleCreateLobby = (
      lobbyName: string,
      callback: (response: 'ok' | 'fail') => void,
      size?: number
    ) => {
      console.log(`Creating lobby ${lobbyName}`);
      if (io.createLobby(lobbyName, socket, size)) {
        console.log(`Socket ${socket.id} created lobby ${lobbyName}`);
        callback('ok');
      } else {
        console.log(`Failed to create lobby ${lobbyName}`);
        callback('fail');
      }
    };
    socket.on('createLobby', handleCreateLobby);

    const handleJoinLobby = (
      lobbyName: string,
      callback: (response: 'ok' | 'fail') => void
    ) => {
      console.log(`Joining lobby ${lobbyName}`);
      if (io.joinLobby(lobbyName, socket)) {
        console.log(`Socket ${socket.id} joined lobby ${lobbyName}`);
        callback('ok');
      } else {
        console.log(`Socket ${socket.id} failed to join lobby ${lobbyName}`);
        callback('fail');
      }
    };
    socket.on('joinLobby', handleJoinLobby);

    const handleLeaveLobby = (callback: (response: 'ok' | 'fail') => void) => {
      const lobbyName = socket.data.lobbyName;
      if (lobbyName) {
        console.log(`Leaving lobby ${lobbyName}`);
        if (io.leaveLobby(lobbyName, socket)) {
          console.log(`Socket ${socket.id} left lobby ${lobbyName}`);
          callback('ok');
        } else {
          console.log(`Socket ${socket.id} failed to leave lobby ${lobbyName}`);
          callback('fail');
        }
      }
    };
    socket.on('leaveLobby', handleLeaveLobby);

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
