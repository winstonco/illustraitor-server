// https://stackoverflow.com/questions/40863488/how-can-i-iterate-over-a-custom-literal-type-in-typescript

export const DrawEvents = [
  'beginDrawing',
  'drawTo',
  'endDrawing',
  'clearCanvas',
] as const;

export type DrawEvents = typeof DrawEvents[number];

export const GameEvents = [...DrawEvents, 'start', 'readyCheck'] as const;

export type GameEvents = typeof GameEvents[number];
