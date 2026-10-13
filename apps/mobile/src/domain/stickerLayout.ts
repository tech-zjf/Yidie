export interface Size {
  width: number;
  height: number;
}
export interface Placement extends Size {
  x: number;
  y: number;
  rotation: number;
}
/** Images are alpha-cropped by native processing; white borders are included. */
export function stickerLayout(sizes: Size[], cell: Size): Placement[] {
  if (!sizes.length) return [];
  const slots = sizes.slice(0, 3).map((size, i) => {
    if (!(size.width > 0 && size.height > 0)) throw new Error('INVALID_IMAGE_SIZE');
    const h = 66,
      w = (h * size.width) / size.height;
    return { width: w, height: h, x: [0, 4, -4][i], y: [0, -1, -2][i], rotation: [-4, 9, -11][i] };
  });
  const bounds = slots.map((p) => {
    const r = (p.rotation * Math.PI) / 180;
    const w = Math.abs(p.width * Math.cos(r)) + Math.abs(p.height * Math.sin(r));
    const h = Math.abs(p.width * Math.sin(r)) + Math.abs(p.height * Math.cos(r));
    return { l: p.x - w / 2, r: p.x + w / 2, t: p.y - h / 2, b: p.y + h / 2 };
  });
  const l = Math.min(...bounds.map((b) => b.l)),
    r = Math.max(...bounds.map((b) => b.r));
  const t = Math.min(...bounds.map((b) => b.t)),
    b = Math.max(...bounds.map((b) => b.b));
  const scale = Math.max(0, Math.min(1, (cell.width - 10) / (r - l), (cell.height - 18) / (b - t)));
  return slots.map((p) => ({
    width: p.width * scale,
    height: p.height * scale,
    rotation: p.rotation,
    x: cell.width / 2 + (p.x - (l + r) / 2) * scale - (p.width * scale) / 2,
    y: cell.height / 2 + (p.y - (t + b) / 2) * scale - (p.height * scale) / 2,
  }));
}
