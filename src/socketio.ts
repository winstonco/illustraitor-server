import { GameServer } from './GameServer.js';

// https://stackoverflow.com/questions/23653617/socket-io-listen-events-in-separate-files-in-node-js
export default function initSocket(io: GameServer) {
  io.on('connection', (socket) => {
    console.log('connected', socket.id);

    socket.on('hello', () => {
      console.log('world');
      console.log(socket.rooms);
    });

    socket.on('createLobby', (name: string, size?: number) => {
      console.log(`Creating lobby ${name}`);
      if (io.createLobby(name, size)) {
        console.log(`Lobby ${name} created`);
      } else {
        console.log(`Failed to create lobby ${name}`);
      }
    });

    socket.on('joinLobby', (name: string) => {
      console.log(`Joining lobby ${name}`);
      if (io.joinLobby(name, socket)) {
        console.log(`Socket ${socket.id} joined lobby ${name}`);

        // Set event listeners
        io.updateDrawEvents(socket);
      } else {
        console.log(`Socket ${socket.id} failed to join lobby ${name}`);
      }
    });

    socket.on('leaveLobby', (name: string) => {
      console.log(`Leaving lobby ${name}`);
      if (io.leaveLobby(name, socket)) {
        console.log(`Socket ${socket.id} left lobby ${name}`);

        // Set event listeners
        io.updateDrawEvents(socket);
      } else {
        console.log(`Socket ${socket.id} failed to leave lobby ${name}`);
      }
    });

    socket.on('startGame', (lobbyName) => {
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
