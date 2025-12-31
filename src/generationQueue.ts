type Task = () => Promise<void>;

export class GenerationQueue {
  private queue: Task[] = [];
  private running = false;

  async enqueue(task: Task): Promise<void> {
    this.queue.push(task);
    if (!this.running) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}
