export async function streamSse<T = Record<string, unknown>>(
  url: string,
  init: RequestInit,
  onEvent: (eventName: string, data: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, { ...init, signal });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`SSE ${init.method ?? 'GET'} ${url} (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processBlock = (block: string) => {
    const trimmed = block.trim();
    if (!trimmed) return;
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const rawLine of trimmed.split('\n')) {
      const line = rawLine.trimEnd();
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (!dataLines.length) return;
    const rawData = dataLines.join('\n');
    try {
      onEvent(eventName, JSON.parse(rawData) as T);
    } catch {
      onEvent(eventName, { raw: rawData } as unknown as T);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');

    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      processBlock(block);
    }
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n');
  if (buffer.trim()) {
    processBlock(buffer);
  }
}
