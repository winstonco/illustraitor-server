export default interface IDraw {
  beginDrawing: (id: string, startX: number, startY: number) => void;
  drawTo: (
    id: string,
    toX: number,
    toY: number,
    width?: number,
    color?: string
  ) => void;
  endDrawing: (id: string) => void;
  clearCanvas: () => void;
}

export type DrawEventArgs =
  | []
  | [id: string]
  | [id: string, startX: number, startY: number]
  | [id: string, toX: number, toY: number, width?: number | undefined];
