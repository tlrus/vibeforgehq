import { afterEach, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('rules mode never calls the AI provider even if a key is configured', async () => {
  vi.stubEnv('OPENAI_API_KEY', 'test-not-a-real-key');
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const response = await POST(new Request('http://localhost/api/pulse/agent', { method: 'POST', body: JSON.stringify({ mode: 'rules', action: 'brief', client: { name: 'Тест', contact: '', stage: 1, product: 'other', history: [] } }) }));
  const body = await response.json();
  expect(body.success).toBe(true); expect(body.data.source).toBe('heuristic'); expect(fetch).not.toHaveBeenCalled();
});
