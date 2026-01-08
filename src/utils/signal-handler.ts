import {getExecutionTime} from './execution-time.js';
import type {Reporter} from './reporter.js';

export const signalReceived =
  (process: NodeJS.Process, startTime: bigint, event: NodeJS.Signals, reporter: Reporter) => (): void => {
    reporter.log(`Done after ${String(getExecutionTime(startTime))}s`);
    process.kill(process.pid, event);
    process.exit(1);
  };

export const handleSignals = (process: NodeJS.Process, startTime: bigint, reporter: Reporter): void => {
  const catchSignals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  catchSignals.forEach((event) => {
    process.once(event, signalReceived(process, startTime, event, reporter));
  });
};
