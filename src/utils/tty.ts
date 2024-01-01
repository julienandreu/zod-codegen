export function isTTY(process: NodeJS.Process): boolean {
  return process.stdout.isTTY || false;
}
