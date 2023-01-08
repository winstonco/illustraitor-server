export default interface IDraw {
  beginDrawing: (startX: number, startY: number) => void;
  drawTo: (toX: number, toY: number, width?: number) => void;
  endDrawing: () => void;
  clearCanvas: () => void;
}

export type DrawEventArgs =
  | []
  | [startX: number, startY: number]
  | [toX: number, toY: number, width?: number | undefined];
