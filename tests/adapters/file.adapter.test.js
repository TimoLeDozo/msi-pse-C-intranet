const path = require('path');
const fs = require('fs');

describe('file.adapter', () => {
  const originalEnv = { ...process.env };
  const outputsDir = path.join(__dirname, '../../storage/outputs');

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, FILE_BASE_URL: 'http://localhost:3000/files' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('exposes a public URL for an allowed file', async () => {
    const fileAdapter = require('../../adapters/storage/file.adapter.js');
    const filePath = path.join(outputsDir, `test_${Date.now()}.txt`);

    await fs.promises.mkdir(outputsDir, { recursive: true });
    await fs.promises.writeFile(filePath, 'data');

    try {
      const url = await fileAdapter.expose(filePath);
      expect(url).toBe(`http://localhost:3000/files/${path.basename(filePath)}`);
    } finally {
      await fs.promises.unlink(filePath);
    }
  });

  it('rejects paths outside the storage directory', () => {
    const fileAdapter = require('../../adapters/storage/file.adapter.js');
    const outsidePath = path.join(__dirname, 'not_allowed.txt');

    expect(fileAdapter.isAllowedPath(outsidePath)).toBe(false);
  });

  it('removes a file when allowed', async () => {
    const fileAdapter = require('../../adapters/storage/file.adapter.js');
    const filePath = path.join(outputsDir, `test_${Date.now()}_remove.txt`);

    await fs.promises.mkdir(outputsDir, { recursive: true });
    await fs.promises.writeFile(filePath, 'data');

    await fileAdapter.remove(filePath);

    await expect(fs.promises.access(filePath)).rejects.toThrow();
  });
});
