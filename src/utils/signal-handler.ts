import {getExecutionTime} from './execution-time';

export const signalReceived = (
  process: NodeJS.Process,
  startTime: bigint,
  event: NodeJS.Signals
) => (): void => {
  console.log(`Done after ${getExecutionTime(startTime)}s`);
  process.kill(process.pid, event);
  process.exit(1);
};

export const handleSignals = (process: NodeJS.Process, startTime: bigint): void => {
  const catchSignals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  catchSignals.map(
    (event): NodeJS.EventEmitter => {
      return process.once(event, signalReceived(process, startTime, event));
    },
  );
};
