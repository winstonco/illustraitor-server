import GameSocket from './GameSocket.js';
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

  /**
   * Adds a socket instance to the lobby.
   * @param socket The socket instance to add
   * @returns true if socket instance was successfully added.
   */
  addPlayer(socket: GameSocket): boolean {
    if (this.isFull()) return false;
    if (this.contains(socket)) return false;
    this._sockets.push(socket);
    this._size++;
    return true;
  }

  /**
   * Removes a socket instance from the lobby.
   * @param socket The socket instance to remove
   * @returns true if removal was successful.
   */
  removePlayer(socket: GameSocket): boolean {
    if (!this.contains(socket)) return false;
    this._sockets = this._sockets.filter((_socket) => _socket.id !== socket.id);
    this._size--;
    return true;
  }

  /**
   *
   * @param socket The socket instance to check
   * @returns true if a socket with the same id exists in the lobby.
   */
  contains(socket: GameSocket): boolean {
    return this._sockets.some((_socket) => _socket.id === socket.id);
  }

  /**
   * @param name The name to check
   * @returns true if a socket with that name exists in the lobby.
   */
  containsName(name: string): boolean {
    return this._sockets.some((_socket) => _socket.data.name === name);
  }

  /**
   * @returns true if size is at the maximum.
   */
  isFull(): boolean {
    return this._size === this._max;
  }

  /**
   * @returns true if size is zero.
   */
  isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Randomly picks and returns a socket instance.
   * @returns a random socket instance from the lobby.
   */
  pickOneRandom(): GameSocket {
    return RandomPicker.pickOne(this._sockets);
  }

  /**
   * Randomly sort and return the socket instances.
   * @returns the array of sockets, randomly ordered.
   */
  genRandomOrdered(): GameSocket[] {
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
