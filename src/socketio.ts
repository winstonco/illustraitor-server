import { GameServer } from './GameServer.js';

// https://stackoverflow.com/questions/23653617/socket-io-listen-events-in-separate-files-in-node-js
export default function initSocket(io: GameServer) {
  io.on('connection', (socket) => {
    console.log('connected', socket.id);

    socket.on(
      'createLobby',
      (
        lobbyName: string,
        callback: (response: 'ok' | 'fail') => void,
        size?: number
      ) => {
        console.log(`Creating lobby ${lobbyName}`);
        if (io.createLobby(lobbyName, socket, size)) {
          console.log(`Lobby ${lobbyName} created`);
          callback('ok');
        } else {
          console.log(`Failed to create lobby ${lobbyName}`);
          callback('fail');
        }
      }
    );

    socket.on(
      'joinLobby',
      (lobbyName: string, callback: (response: 'ok' | 'fail') => void) => {
        console.log(`Joining lobby ${lobbyName}`);
        if (io.joinLobby(lobbyName, socket)) {
          io.updateDrawEvents(socket);
          console.log(`Socket ${socket.id} joined lobby ${lobbyName}`);
          callback('ok');
        } else {
          console.log(`Socket ${socket.id} failed to join lobby ${lobbyName}`);
          callback('fail');
        }
      }
    );

    socket.on('leaveLobby', (callback: (response: 'ok' | 'fail') => void) => {
      const lobbyName = socket.data.lobbyName;
      console.log(`Leaving lobby ${lobbyName}`);
      if (io.leaveLobby(socket)) {
        io.updateDrawEvents(socket);
        console.log(`Socket ${socket.id} left lobby ${lobbyName}`);
        callback('ok');
      } else {
        console.log(`Socket ${socket.id} failed to leave lobby ${lobbyName}`);
        callback('fail');
      }
    });

    socket.on('startGame', (lobbyName: string) => {
      io.startGame(lobbyName);
      // io.readyCheck(lobbyName, 3000);
    });

    // Disconnect
    socket.on('disconnecting', (reason) => {
      console.log(`Socket ${socket.id} disconnected`);
      io.drop(socket);
    });
  });
}
