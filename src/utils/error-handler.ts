import {getExecutionTime} from './execution-time';

export const errorReceived = (process: NodeJS.Process, startTime: bigint) => (): void => {
  console.log(`Done after ${getExecutionTime(startTime)}s`);
  process.exit(1);
};

export const handleErrors = (process: NodeJS.Process, startTime: bigint): void => {
  const catchErrors: string[] = ['unhandledRejection', 'uncaughtException'];
  catchErrors.map((event): NodeJS.EventEmitter => {
    return process.on(event, errorReceived(process, startTime));
  });
};
