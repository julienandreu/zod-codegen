export function getExecutionTime(startTime: bigint): number {
  return Number(process.hrtime.bigint() - startTime) / 1000000000;
}
