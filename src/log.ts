export enum LogLevel {
  Info = 'info',
  Error = 'error',
}

export enum LogArea {
  Discord = 'discord',
  Webhooks = 'webhooks',
  Orbit = 'orbit',
}

const getTime = (): {hours: string; minutes: string} => {
  const date = new Date();
  const rawMinutes = date.getMinutes();
  const rawHours = date.getHours();
  const hours = (rawHours < 10 ? '0' : '') + rawHours.toLocaleString();
  const minutes = (rawMinutes < 10 ? '0' : '') + rawMinutes.toLocaleString();
  return {hours, minutes};
};

export function log(logLevel: LogLevel, area: LogArea, message: string) {
  const captains: Console = console;
  const {hours, minutes} = getTime();
  const stack = new Error().stack?.split(' at ')[2].replace('\n', '').trim();
  let timestamp = `${hours}:${minutes}`;
  if (process.env.NODE_ENV === 'development') {
    const timestampSplit = timestamp.split('');
    timestampSplit[timestamp.length] = ` ${stack?.slice(
      stack.indexOf(' ') + 1,
    )}`;
    timestamp = timestampSplit.join('');
  }
  captains[logLevel](`[${timestamp}] [${area}] ${message}`);
}
