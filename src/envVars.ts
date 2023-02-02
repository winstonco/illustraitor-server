import dotenv from 'dotenv';
dotenv.config();

const PORT: number = parseInt(process.env.PORT ?? '5555');
const ORIGIN: string = process.env.ORIGIN ?? 'http://localhost:5173';

// Game settings
const settings = {
  outOfGameDrawEnabled:
    process.env.OUT_OF_GAME_DRAW_ENABLED === 'true' ? true : false ?? true,
  turnLength: parseInt(process.env.TURN_LENGTH) ?? 10,
  clearOnEnd: process.env.CLEAR_ON_END === 'true' ? true : false ?? true,
  timeToGuess: parseInt(process.env.TIME_TO_GUESS) ?? 10,
  minimumPlayers: parseInt(process.env.MINIMUM_PLAYERS) ?? 3,
  traceLevel: parseInt(process.env.TRACE_LEVEL) ?? 0,
};

export { PORT, ORIGIN, settings };
