import {format} from 'node:util';

export class Reporter {
  constructor(
    private readonly stdout: NodeJS.WriteStream,
    private readonly stderr: NodeJS.WriteStream = stdout,
  ) {
    this.log = this.log.bind(this);
    this.error = this.error.bind(this);
  }

  log(...args: readonly unknown[]): void {
    this.stdout.write(format(...args) + '\n');
  }

  error(...args: readonly unknown[]): void {
    this.stderr.write(format(...args) + '\n');
  }
}
