import {getExecutionTime} from './execution-time.js';

export const errorReceived = (process: NodeJS.Process, startTime: bigint) => (): void => {
  console.log(`Done after ${String(getExecutionTime(startTime))}s`);
  process.exit(1);
};

export const handleErrors = (process: NodeJS.Process, startTime: bigint): void => {
  const catchErrors: string[] = ['unhandledRejection', 'uncaughtException'];
  catchErrors.forEach((event) => {
    process.on(event, errorReceived(process, startTime));
  });
};
