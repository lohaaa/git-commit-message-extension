export class OpenAIClient {
  constructor(private baseUrl: string, private apiKey: string, private model: string) {}

  async *streamChatCompletion(prompt: string, signal: AbortSignal): AsyncGenerator<string> {
    // Normalize baseUrl: remove trailing slash
    const normalizedBaseUrl = this.baseUrl.replace(/\/$/, '');

    // Smart endpoint detection: if base URL already contains version path (e.g., /v4, /v1),
    // just append /chat/completions, otherwise append /v1/chat/completions
    const hasVersionPath = /\/v\d+$/.test(normalizedBaseUrl);
    const endpoint = hasVersionPath
      ? `${normalizedBaseUrl}/chat/completions`
      : `${normalizedBaseUrl}/v1/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
