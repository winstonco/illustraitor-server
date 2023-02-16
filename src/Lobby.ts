import GameSocket from './types/GameSocket.js';
import GameSettings from './types/GameSettings.js';
import RandomPicker from './utils/RandomPicker.js';
import traceLog from './utils/traceLog.js';

export default class Lobby {
  private _sockets: GameSocket[];
  private _size: number;
  private _max: number;
  private _name: string;
  private _settings: GameSettings;

  constructor(
    lobby_name: string,
    max_size: number = 8,
    settings: GameSettings
  ) {
    this._name = lobby_name;
    this._sockets = [];
    this._size = 0;
    this._max = max_size;
    this._settings = settings;
  }

  /**
   * Adds a socket instance to the lobby.
   * @param socket The socket instance to add
   * @returns true if socket instance was successfully added.
   */
  addPlayer(socket: GameSocket): boolean {
    traceLog(2, `Lobby.ts:24 -- Adding player ${socket.id}`);
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
    traceLog(2, `Lobby.ts:38 -- Removing player ${socket.id}`);
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
   * Returns a random array of sockets in the lobby.
   * @param count The number of sockets to randomly pick.
   * @returns an array of random sockets.
   */
  pickRandom(count = 1): GameSocket[] {
    return RandomPicker.pickMany(this._sockets, count);
  }

  /**
   * Randomly sets imposters.
   * @param count The number of imposters to randomly pick.
   */
  pickImposters(count = 1) {
    console.log(`count: ${count}`);
    this.pickRandom(count).forEach((socket) => {
      socket.data.role = 'imposter';
    });
  }

  /**
   * Resets all socket roles to 'real'.
   */
  resetRoles() {
    this.sockets.forEach((socket) => {
      socket.data.role = 'real';
    });
  }

  /**
   * Randomly sort and return the socket instances.
   * @returns the array of sockets, randomly ordered.
   */
  genRandomOrdered(): GameSocket[] {
    const ordered: GameSocket[] = this._sockets.sort(() => {
      return Math.floor(Math.random() * 3) - 1;
    });
    return ordered;
  }

  getSocketByName(name: string): GameSocket | undefined {
    return this._sockets.find((socket) => socket.data.name === name);
  }

  get sockets(): GameSocket[] {
    return this._sockets;
  }

  get imposters(): GameSocket[] {
    return this._sockets.filter((socket) => socket.data.role === 'imposter');
  }

  get playerIds(): string[] {
    return this._sockets.map((gs) => gs.id);
  }

  get playerNames(): string[] {
    return this._sockets.map((gs) => gs.data.name ?? gs.id);
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

  get settings(): GameSettings {
    return this._settings;
  }
}
