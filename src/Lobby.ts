import RandomPicker from './utils/RandomPicker.js';

export default class Lobby {
  private _sockets: string[];
  private _size: number;
  private _max: number;
  private _name: string;

  constructor(lobby_name: string, max_size: number = 8) {
    this._name = lobby_name;
    this._sockets = [];
    this._size = 0;
    this._max = max_size;
  }

  addPlayer(socket_id: string): boolean {
    if (!this.isFull() && !this.contains(socket_id)) {
      this._sockets.push(socket_id);
      this._size++;
      return true;
    }
    return false;
  }

  removePlayer(socket_id: string): boolean {
    if (this.contains(socket_id)) {
      this._sockets = this._sockets.filter((s) => {
        if (s !== socket_id) {
          return true;
        }
        this._size--;
        return false;
      });
      return true;
    }
    return false;
  }

  contains(socket_id: string): boolean {
    return this._sockets.includes(socket_id);
  }

  isFull(): boolean {
    return this._size === this._max;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  pickOne(): string {
    return RandomPicker.pickOne(this._sockets);
  }

  genOrdered(): string[] {
    // Randomly sort and return a copy of the sockets array
    let ordered: string[] = this._sockets.sort(() => {
      return Math.floor(Math.random() * 3) - 1;
    });
    return ordered;
  }

  get players(): string[] {
    return this._sockets;
  }

  get size(): number {
    return this._size;
  }

  get name(): string {
    return this._name;
  }
}
