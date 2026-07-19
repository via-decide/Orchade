export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  timeoutMs?: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 300;
  const timeoutMs = options.timeoutMs ?? 10000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await Promise.race([
        operation(),
        wait(timeoutMs).then(() => {
          throw new Error(`Operation timed out after ${timeoutMs}ms`);
        }),
      ]);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(delayMs * attempt);
    }
  }

  throw lastError;
}
