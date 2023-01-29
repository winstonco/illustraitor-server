import { GameSocket } from './types/SocketIOEvents.js';
import RandomPicker from './utils/RandomPicker.js';

export default class Lobby {
  private _sockets: GameSocket[];
  private _size: number;
  private _max: number;
  private _name: string;

  constructor(lobby_name: string, max_size: number = 8) {
    this._name = lobby_name;
    this._sockets = [];
    this._size = 0;
    this._max = max_size;
  }

  addPlayer(socket: GameSocket): boolean {
    if (!this.isFull() && !this.contains(socket)) {
      this._sockets.push(socket);
      this._size++;
      return true;
    }
    return false;
  }

  removePlayer(socket: GameSocket): boolean {
    if (this.contains(socket)) {
      this._sockets = this._sockets.filter((_socket) => {
        if (_socket.id !== socket.id) {
          return true;
        }
        this._size--;
        return false;
      });
      return true;
    }
    return false;
  }

  contains(socket: GameSocket): boolean {
    return this._sockets.some((_socket) => _socket.id === socket.id);
  }

  containsName(name: string): boolean {
    return this._sockets.some((_socket) => _socket.data.name === name);
  }

  isFull(): boolean {
    return this._size === this._max;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  pickOne(): GameSocket {
    return RandomPicker.pickOne(this._sockets);
  }

  genOrdered(): GameSocket[] {
    // Randomly sort and return a copy of the sockets array
    let ordered: GameSocket[] = this._sockets.sort(() => {
      return Math.floor(Math.random() * 3) - 1;
    });
    return ordered;
  }

  get sockets(): GameSocket[] {
    return this._sockets;
  }

  get playerIds(): string[] {
    return this._sockets.map((gs) => gs.id);
  }

  get size(): number {
    return this._size;
  }

  get name(): string {
    return this._name;
  }

  get host(): GameSocket {
    return this._sockets[0] ?? null;
  }
}
