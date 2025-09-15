import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Generator} from '../../src/generator.js';
import {Reporter} from '../../src/utils/reporter.js';

describe('Generator', () => {
  let generator: Generator;
  let mockReporter: Reporter;

  beforeEach(() => {
    // Create a mock reporter
    mockReporter = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      success: vi.fn(),
    } as unknown as Reporter;

    generator = new Generator('test-app', '1.0.0', mockReporter, './test-input.json', './test-output');
  });

  describe('constructor', () => {
    it('should create a new Generator instance', () => {
      expect(generator).toBeInstanceOf(Generator);
    });
  });

  describe('run', () => {
    it('should be a function', () => {
      expect(typeof generator.run).toBe('function');
    });

    it('should have the run method defined', () => {
      expect(generator).toHaveProperty('run');
    });
  });
});
