const guildChains = new Map<string, Promise<unknown>>();

/**
 * Runs jobs of one guild one after another, so slot counts read by one job include the
 * emoji the previous job created. Jobs of different guilds run in parallel.
 */
export const runForGuild = <T>(guildId: string, job: () => Promise<T>): Promise<T> => {
  const previous = guildChains.get(guildId) ?? Promise.resolve();
  const run = previous.then(job, job);
  const tail = run.then(
    () => undefined,
    () => undefined
  );
  guildChains.set(guildId, tail);
  void tail.then(() => {
    if (guildChains.get(guildId) === tail) guildChains.delete(guildId);
  });
  return run;
};

/** Limits concurrent heavy work (downloads + optimization run in the manager process). */
export class Semaphore {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly permits: number) {}

  async run<T>(job: () => Promise<T>): Promise<T> {
    if (this.active >= this.permits) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.active++;
    }
    try {
      return await job();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
