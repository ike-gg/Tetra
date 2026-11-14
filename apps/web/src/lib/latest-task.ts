type LatestTaskHandlers<Output> = {
  onStart?: () => void;
  onResult: (output: Output) => void;
  onError: (error: unknown) => void;
  // A finished result that's already stale, for cleanup (like revoking an object URL)
  onDiscard?: (output: Output) => void;
};

// Runs only the newest request. Starting one aborts the run in flight, and each run carries
// a version, so a result that still arrives late (a run that ignored its signal, or finished
// in the same tick as the abort) is discarded instead of overwriting a newer one.
export const createLatestTask = <Input, Output>(
  run: (input: Input, signal: AbortSignal) => Promise<Output>,
  handlers: LatestTaskHandlers<Output>
) => {
  let version = 0;
  let controller: AbortController | null = null;
  let disposed = false;

  const isCurrent = (id: number) => id === version && !disposed;

  return {
    request(input: Input) {
      if (disposed) return;
      controller?.abort();
      const own = new AbortController();
      controller = own;
      const id = ++version;
      handlers.onStart?.();

      void run(input, own.signal).then(
        (output) => {
          if (isCurrent(id)) handlers.onResult(output);
          else handlers.onDiscard?.(output);
        },
        (error: unknown) => {
          if (isCurrent(id) && !own.signal.aborted) handlers.onError(error);
        }
      );
    },
    dispose() {
      disposed = true;
      controller?.abort();
    },
  };
};
