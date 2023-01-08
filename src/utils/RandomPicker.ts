export default class RandomPicker {
  static pickOne(arr: any[]): any {
    return arr[Math.round(Math.random() * arr.length)];
  }
}
