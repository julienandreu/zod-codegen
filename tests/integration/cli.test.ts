import {describe, expect, it} from 'vitest';
import {execSync} from 'node:child_process';
import {resolve} from 'node:path';

describe('CLI Integration', () => {
  describe('--help', () => {
    it('should display help information', () => {
      const result = execSync('npm run build && node ./dist/src/cli.js --help', {
        encoding: 'utf-8',
        cwd: resolve(__dirname, '../..'),
      });

      expect(result).toContain('Usage:');
      expect(result).toContain('--input');
      expect(result).toContain('--output');
    });
  });

  describe('--version', () => {
    it('should display version information', () => {
      const result = execSync('npm run build && node ./dist/src/cli.js --version', {
        encoding: 'utf-8',
        cwd: resolve(__dirname, '../..'),
      });

      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
