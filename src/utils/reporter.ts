import {format} from 'util';

export class Reporter {
  constructor(private _stdout: NodeJS.WriteStream) {
    this.log = this.log.bind(this);
  }

  log(...args: unknown[]) {
    this._stdout.write(format(...args) + '\n');
  }

  error(...args: unknown[]) {
    this._stdout.write(format(...args) + '\n');
  }
}
