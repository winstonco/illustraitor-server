export default class RandomPicker {
  static pickOne<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  static pickMany<T>(arr: T[], count: number): T[] {
    const itemsFound: T[] = [];
    while (itemsFound.length < count && itemsFound.length < arr.length) {
      const randomItem = arr[Math.floor(Math.random() * arr.length)];
      if (!itemsFound.includes(randomItem)) {
        itemsFound.push(randomItem);
      }
    }
    return itemsFound;
  }
}
