import dotenv from 'dotenv';
dotenv.config();

const PORT: number = parseInt(process.env.PORT ?? '5555');
const ORIGIN: string = process.env.ORIGIN ?? 'http://localhost:5173';

// Game settings
const serverSettings = {
  outOfGameDrawEnabled:
    process.env.OUT_OF_GAME_DRAW_ENABLED === 'true' ? true : false ?? true,
  clearOnEnd: process.env.CLEAR_ON_END === 'true' ? true : false ?? true,
  minimumPlayers: parseInt(process.env.MINIMUM_PLAYERS) ?? 3,
  traceLevel: parseInt(process.env.TRACE_LEVEL) ?? 0,
};

export { PORT, ORIGIN, serverSettings };
