const priorities = { debug: 10, info: 20, warn: 30, error: 40 };
export type LogLevel = keyof typeof priorities;
type Fields = Record<string, string | number | boolean>;

export interface Logger {
  log(level: LogLevel, event: string, fields?: Fields): void;
}

export function createLogger(
  minimum: LogLevel,
  token: string,
  write = (line: string, level: LogLevel) => {
    (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
  },
): Logger {
  const redact = (value: string) =>
    token ? value.replaceAll(token, '[REDACTED]') : value;
  return {
    log(level, event, fields = {}) {
      if (priorities[level] < priorities[minimum]) return;

      const safeFields = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [
          redact(key),
          typeof value === 'string' ? redact(value) : value,
        ]),
      );
      write(
        JSON.stringify({
          time: new Date().toISOString(),
          level,
          event: redact(event),
          ...safeFields,
        }),
        level,
      );
    },
  };
}
