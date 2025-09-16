import {format} from 'node:util';

export class Reporter {
  constructor(private readonly _stdout: NodeJS.WriteStream) {
    this.log = this.log.bind(this);
    this.error = this.error.bind(this);
  }

  log(...args: readonly unknown[]): void {
    this._stdout.write(format(...args) + '\n');
  }

  error(...args: readonly unknown[]): void {
    this._stdout.write(format(...args) + '\n');
  }
}
