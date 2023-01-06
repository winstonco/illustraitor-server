export interface IDraw {
  beginDrawing: (startX: number, startY: number) => void;
  drawTo: (toX: number, toY: number, width?: number) => void;
  endDrawing: () => void;
  clearCanvas: () => void;
}
