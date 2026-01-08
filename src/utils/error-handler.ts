import {getExecutionTime} from './execution-time.js';
import type {Reporter} from './reporter.js';

export const errorReceived = (process: NodeJS.Process, startTime: bigint, reporter: Reporter) => (): void => {
  reporter.log(`Done after ${String(getExecutionTime(startTime))}s`);
  process.exit(1);
};

export const handleErrors = (process: NodeJS.Process, startTime: bigint, reporter: Reporter): void => {
  const catchErrors: string[] = ['unhandledRejection', 'uncaughtException'];
  catchErrors.forEach((event) => {
    process.on(event, errorReceived(process, startTime, reporter));
  });
};
