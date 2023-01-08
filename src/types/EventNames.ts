// https://stackoverflow.com/questions/40863488/how-can-i-iterate-over-a-custom-literal-type-in-typescript

export const DrawEvents = [
  'beginDrawing',
  'drawTo',
  'endDrawing',
  'clearCanvas',
] as const;

export type DrawEvents = typeof DrawEvents[number];

export const ServerEvents = [
  ...DrawEvents,
  'startGame',
  'readyCheck',
  'startTurn',
] as const;

export type ServerEvents = typeof ServerEvents[number];
