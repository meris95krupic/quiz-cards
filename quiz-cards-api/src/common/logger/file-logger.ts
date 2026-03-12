import { LoggerService, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 3;

/**
 * Logger that writes to stdout (like NestJS default) AND to a log file.
 * Rotates when the file exceeds 5 MB, keeps up to 3 old files.
 */
export class FileLogger implements LoggerService {
  private logDir: string;
  private logPath: string;
  private stream: fs.WriteStream;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir))
      fs.mkdirSync(this.logDir, { recursive: true });
    this.logPath = path.join(this.logDir, 'app.log');
    this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
  }

  log(message: string, context?: string) {
    this.write('LOG', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.write('ERROR', message, context);
    if (trace) this.write('ERROR', trace, context);
  }

  warn(message: string, context?: string) {
    this.write('WARN', message, context);
  }

  debug(message: string, context?: string) {
    this.write('DEBUG', message, context);
  }

  verbose(message: string, context?: string) {
    this.write('VERBOSE', message, context);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setLogLevels(_levels: LogLevel[]) {
    // no-op — we log everything to file
  }

  private write(level: string, message: string, context?: string) {
    const ts = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    const line = `${ts} ${level.padEnd(7)} ${ctx} ${message}`;

    // stdout (keeps default NestJS console behaviour)
    process.stdout.write(line + '\n');

    // file
    this.stream.write(line + '\n');
    this.rotateIfNeeded();
  }

  private rotateIfNeeded() {
    try {
      const stats = fs.statSync(this.logPath);
      if (stats.size < MAX_FILE_SIZE) return;

      this.stream.end();

      // shift old files: app.2.log → app.3.log, app.1.log → app.2.log, …
      for (let i = MAX_FILES; i >= 1; i--) {
        const from = path.join(
          this.logDir,
          i === 1 ? 'app.log' : `app.${i - 1}.log`,
        );
        const to = path.join(this.logDir, `app.${i}.log`);
        if (fs.existsSync(from)) {
          if (i === MAX_FILES && fs.existsSync(to)) fs.unlinkSync(to); // drop oldest
          try {
            fs.renameSync(from, to);
          } catch {
            /* race-safe */
          }
        }
      }

      this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
    } catch {
      // ignore rotation errors
    }
  }
}
