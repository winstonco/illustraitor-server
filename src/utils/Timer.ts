export default class Timer {
  protected timeRemaining: number;

  constructor(initialTime = 60) {
    this.timeRemaining = initialTime;
  }

  async start(callback: Function = () => {}, showTime: boolean = false) {
    if (showTime) {
      console.log(this.timeRemaining);
    }
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      await Timer.wait();
      await this.start(callback, showTime);
    } else if (this.timeRemaining === 0) {
      callback();
    }
  }

  static wait(time: number = 1): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time * 1000);
    });
  }

  get time(): number {
    return this.timeRemaining;
  }

  public isDone(): boolean {
    return this.timeRemaining === 0;
  }
}
