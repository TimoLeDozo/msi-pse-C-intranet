jest.mock('axios', () => ({
  post: jest.fn()
}));

describe('ollama.adapter', () => {
  const originalEnv = { ...process.env };

  const setup = () => {
    jest.resetModules();
    const axios = require('axios');
    axios.post.mockReset();
    process.env = {
      ...originalEnv,
      OLLAMA_BASE_URL: 'http://localhost:11434/v1',
      OLLAMA_MODEL: 'qwen2.5:14b',
      AI_TIMEOUT_MS: '1000'
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = require('../../adapters/ai/ollama.adapter');
    return { adapter, axios };
  };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('returns parsed sections for valid JSON', async () => {
    const { adapter, axios } = setup();
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: '{"titre":"Test","contexte":"Ctx"}' } }],
        usage: { prompt_tokens: 1 }
      }
    });

    const result = await adapter.generateStructuredContent({
      messages: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u' }
      ],
      temperature: 0.3,
      forceJson: true
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        model: 'qwen2.5:14b',
        messages: expect.any(Array),
        temperature: 0.3,
        stream: false,
        response_format: { type: 'json_object' }
      }),
      expect.any(Object)
    );
    expect(result.sections).toEqual({ titre: 'Test', contexte: 'Ctx' });
    expect(result.model).toBe('qwen2.5:14b');
  });

  it('throws when messages are missing', async () => {
    const { adapter } = setup();
    await expect(adapter.generateStructuredContent({})).rejects.toThrow(
      'OllamaAdapter: messages requis'
    );
  });

  it('wraps ECONNREFUSED errors', async () => {
    const { adapter, axios } = setup();
    axios.post.mockRejectedValue({ code: 'ECONNREFUSED' });

    await expect(
      adapter.generateStructuredContent({
        messages: [{ role: 'system', content: 's' }]
      })
    ).rejects.toThrow('Impossible de contacter Ollama');
  });

  it('wraps API errors', async () => {
    const { adapter, axios } = setup();
    axios.post.mockRejectedValue({ response: { data: { error: 'bad' } } });

    await expect(
      adapter.generateStructuredContent({
        messages: [{ role: 'system', content: 's' }]
      })
    ).rejects.toThrow('OllamaAdapter Error');
  });
});
