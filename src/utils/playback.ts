export interface PlayerProgressMessage {
  currentTime: number;
  duration: number;
}

function finiteNumber(value: unknown) {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePlayerProgressMessage(value: unknown): PlayerProgressMessage | undefined {
  let message = value;
  if (typeof message === 'string') {
    try {
      message = JSON.parse(message);
    } catch {
      return undefined;
    }
  }
  if (!message || typeof message !== 'object') return undefined;

  const root = message as Record<string, unknown>;
  const candidates: Record<string, unknown>[] = [root];
  [root.data, root.detail, root.payload, root.progress, root.value].forEach((candidate) => {
    let parsed = candidate;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return;
      }
    }
    if (parsed && typeof parsed === 'object') candidates.push(parsed as Record<string, unknown>);
  });

  for (const source of candidates) {
    const currentTime = finiteNumber(
      source.currentTime ?? source.current_time ?? source.position ?? source.time ?? source.seconds,
    );
    const duration = finiteNumber(
      source.duration ?? source.totalDuration ?? source.total_duration ?? source.length,
    );
    if (currentTime === undefined || duration === undefined || currentTime < 0 || duration <= 0 || currentTime > duration * 1.2) {
      continue;
    }
    return { currentTime: Math.min(currentTime, duration), duration };
  }
  return undefined;
}
