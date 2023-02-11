import { serverSettings } from '../envVars.js';

const traceLog = (level: number = 0, ...message: any[]) => {
  if (serverSettings.traceLevel >= level) console.log(...message);
};

export default traceLog;
