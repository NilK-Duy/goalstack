import { describe, expect, it } from 'vitest';
import { describeUrlHost, normaliseUrl } from './url';

describe('normaliseUrl', () => {
  it('keeps http and https addresses', () => {
    expect(normaliseUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
    expect(normaliseUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('assumes https for a bare host', () => {
    expect(normaliseUrl('example.com')).toBe('https://example.com/');
    expect(normaliseUrl('figma.com/file/abc')).toBe('https://figma.com/file/abc');
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseUrl('  https://example.com/  ')).toBe('https://example.com/');
  });

  it('rejects protocols that would execute when the saved link is clicked', () => {
    expect(normaliseUrl('javascript:alert(1)')).toBeNull();
    expect(normaliseUrl('JavaScript:alert(1)')).toBeNull();
    expect(normaliseUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(normaliseUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects input that is not an address', () => {
    expect(normaliseUrl('')).toBeNull();
    expect(normaliseUrl('   ')).toBeNull();
    expect(normaliseUrl('just some notes')).toBeNull();
    expect(normaliseUrl('localhost')).toBeNull();
  });
});

describe('describeUrlHost', () => {
  it('returns the host without a www prefix', () => {
    expect(describeUrlHost('https://www.example.com/a/b')).toBe('example.com');
    expect(describeUrlHost('https://docs.example.co.uk/x')).toBe('docs.example.co.uk');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(describeUrlHost('not a url')).toBe('not a url');
  });
});
