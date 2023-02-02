import { settings } from '../envVars.js';

const traceLog = (level: number = 0, ...message: any[]) => {
  if (settings.traceLevel >= level) console.log(...message);
};

export default traceLog;
