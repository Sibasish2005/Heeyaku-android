import { formatDuration, formatVerboseDuration, formatRelativeDate } from '../src/utils/formatters';

describe('formatters utility', () => {
  describe('formatDuration', () => {
    it('formats 0 seconds as 00:00', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('formats single-digit seconds with leading zero', () => {
      expect(formatDuration(5)).toBe('00:05');
    });

    it('formats mixed minutes and seconds', () => {
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(125)).toBe('02:05');
    });

    it('formats hour-level durations as Xh Ym', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(3665)).toBe('1h 1m');
      expect(formatDuration(7320)).toBe('2h 2m');
    });

    it('handles negative or invalid seconds gracefully', () => {
      expect(formatDuration(-10)).toBe('00:00');
    });
  });

  describe('formatVerboseDuration', () => {
    it('formats 0s', () => {
      expect(formatVerboseDuration(0)).toBe('0s');
    });

    it('formats seconds only when under 1 minute', () => {
      expect(formatVerboseDuration(45)).toBe('45s');
    });

    it('formats minutes and seconds when under 1 hour', () => {
      expect(formatVerboseDuration(125)).toBe('2m 5s');
    });

    it('formats hours and minutes when over 1 hour', () => {
      expect(formatVerboseDuration(3665)).toBe('1h 1m');
    });
  });

  describe('formatRelativeDate', () => {
    it('returns empty string for falsy timestamp', () => {
      expect(formatRelativeDate(0)).toBe('');
    });

    it('formats today timestamp with time', () => {
      const now = Date.now();
      const formatted = formatRelativeDate(now);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('formats yesterday timestamp as "Yesterday"', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    });
  });
});
