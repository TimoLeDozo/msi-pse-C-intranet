const { safeJsonParse } = require('../../utils/json.util');

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    const result = safeJsonParse('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it('extracts JSON from noisy content', () => {
    const result = safeJsonParse('prefix {"b":2} suffix');
    expect(result).toEqual({ b: 2 });
  });

  it('throws on invalid JSON', () => {
    expect(() => safeJsonParse('not json')).toThrow('JSON invalide');
  });
});
