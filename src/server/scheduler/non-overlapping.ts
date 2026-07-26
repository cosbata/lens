export function startNonOverlappingPoller(
  run: () => Promise<void>,
  intervalMs: number,
) {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new Error("invalid_poll_interval");
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    try {
      await run();
    } finally {
      if (!stopped) timer = setTimeout(poll, intervalMs);
    }
  };
  void poll();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
