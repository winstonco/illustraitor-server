// https://stackoverflow.com/questions/45194598/using-process-env-in-typescript

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      ORIGIN: string;

      // Game settings
      OUT_OF_GAME_DRAW_ENABLED: 'true' | 'false';
      TURN_LENGTH: string;
      CLEAR_ON_END: 'true' | 'false';
      TIME_TO_GUESS: string;
      MINIMUM_PLAYERS: string;
      TRACE_LEVEL: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
