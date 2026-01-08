import {describe, expect, it, vi} from 'vitest';
import {Reporter} from '../../src/utils/reporter';

describe('Reporter', () => {
  it('should write log messages to stdout', () => {
    const stdout = {write: vi.fn()} as unknown as NodeJS.WriteStream;
    const reporter = new Reporter(stdout);

    reporter.log('Hello', 'World');

    expect(stdout.write).toHaveBeenCalledWith('Hello World\n');
  });

  it('should write error messages to stderr when provided', () => {
    const stdout = {write: vi.fn()} as unknown as NodeJS.WriteStream;
    const stderr = {write: vi.fn()} as unknown as NodeJS.WriteStream;
    const reporter = new Reporter(stdout, stderr);

    reporter.error('Error occurred');

    expect(stderr.write).toHaveBeenCalledWith('Error occurred\n');
    expect(stdout.write).not.toHaveBeenCalled();
  });

  it('should fall back to stdout for errors when stderr is not provided', () => {
    const stdout = {write: vi.fn()} as unknown as NodeJS.WriteStream;
    const reporter = new Reporter(stdout);

    reporter.error('Error occurred');

    expect(stdout.write).toHaveBeenCalledWith('Error occurred\n');
  });

  it('should format multiple arguments', () => {
    const stdout = {write: vi.fn()} as unknown as NodeJS.WriteStream;
    const reporter = new Reporter(stdout);

    reporter.log('Count:', 42, 'items');

    expect(stdout.write).toHaveBeenCalledWith('Count: 42 items\n');
  });

  it('should handle objects in log messages', () => {
    const stdout = {write: vi.fn()} as unknown as NodeJS.WriteStream;
    const reporter = new Reporter(stdout);

    reporter.log('Data:', {key: 'value'});

    expect(stdout.write).toHaveBeenCalledWith("Data: { key: 'value' }\n");
  });

  it('should bind methods correctly for use as callbacks', () => {
    const stdout = {write: vi.fn()} as unknown as NodeJS.WriteStream;
    const reporter = new Reporter(stdout);

    const {log, error} = reporter;

    log('Test log');
    error('Test error');

    expect(stdout.write).toHaveBeenCalledTimes(2);
  });
});
