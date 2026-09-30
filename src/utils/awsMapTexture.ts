const CANVAS_W = 2048;
const CANVAS_H = 1024;

const OCEAN_COLOR = '#93C5FD';
const LAND_COLOR = '#DDD6FE';
const BORDER_COLOR = '#C084FC';

function lngLatToXY(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * CANVAS_W;
  const y = ((90 - lat) / 180) * CANVAS_H;
  return [x, y];
}

const CONTINENTS: number[][][] = [
  // North America
  [[-130,50],[-120,60],[-100,65],[-80,60],[-60,50],[-70,45],[-80,30],[-100,25],[-105,20],[-120,30],[-130,50]],
  [[-80,30],[-60,25],[-55,15],[-65,10],[-85,10],[-90,15],[-100,25],[-80,30]],
  // South America
  [[-80,10],[-60,5],[-35,-5],[-40,-20],[-50,-30],[-60,-40],[-70,-55],[-75,-45],[-70,-30],[-75,-15],[-80,0],[-80,10]],
  // Europe
  [[-10,40],[0,45],[5,50],[10,55],[15,60],[25,65],[30,60],[35,55],[40,50],[35,45],[30,40],[25,35],[15,35],[5,35],[-5,35],[-10,40]],
  // Africa
  [[-15,35],[10,35],[15,30],[25,25],[35,20],[45,10],[50,0],[45,-10],[40,-20],[35,-30],[30,-35],[25,-35],[20,-30],[15,-20],[10,-10],[5,0],[0,5],[-5,10],[-10,15],[-15,20],[-15,35]],
  // Asia
  [[30,40],[40,45],[50,50],[60,55],[70,60],[80,65],[90,60],[100,55],[110,50],[120,45],[130,40],[135,35],[120,25],[110,20],[100,15],[90,10],[80,15],[70,20],[60,25],[50,30],[40,35],[30,40]],
  [[40,35],[50,30],[60,25],[70,20],[80,15],[90,10],[100,15],[110,20],[120,25],[110,30],[100,35],[90,40],[80,45],[70,45],[60,45],[50,40],[40,35]],
  // Australia
  [[115,-15],[130,-15],[145,-15],[150,-20],[150,-30],[145,-35],[140,-38],[135,-35],[130,-30],[125,-25],[115,-25],[110,-20],[115,-15]],
  // Greenland
  [[-55,60],[-45,65],[-30,70],[-20,75],[-20,80],[-30,82],[-45,80],[-55,75],[-55,70],[-55,60]],
  // Japan
  [[130,30],[132,33],[135,35],[140,40],[142,43],[145,45],[143,42],[140,38],[136,34],[133,31],[130,30]],
  // UK / Ireland
  [[-8,50],[-5,52],[0,53],[2,55],[0,58],[-3,58],[-6,56],[-8,54],[-8,50]],
];

function drawPolygon(ctx: CanvasRenderingContext2D, coords: number[][]) {
  if (coords.length < 3) return;
  ctx.beginPath();
  const [sx, sy] = lngLatToXY(coords[0][0], coords[0][1]);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < coords.length; i++) {
    const [x, y] = lngLatToXY(coords[i][0], coords[i][1]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function generateAwsLightTexture(): string {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d')!;

  // Ocean
  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid lines (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * CANVAS_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = ((90 - lat) / 180) * CANVAS_H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Land
  ctx.fillStyle = LAND_COLOR;
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 2;

  for (const polygon of CONTINENTS) {
    drawPolygon(ctx, polygon);
  }

  return canvas.toDataURL('image/png');
}
