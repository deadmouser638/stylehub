// Finds the main colour of the object in a photo, as one of the catalog's named colours.
// Pixels in the centre of the frame count more, and colours that dominate the border
// (usually the background) count less, so a black watch on a white table reads as Black.

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
};

export const nameColor = (r, g, b) => {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l < 0.13) return 'Black';
  if (l > 0.9 && s < 0.35) return 'White';
  if (s < 0.14) return l > 0.62 ? 'White' : l < 0.22 ? 'Black' : 'Grey';
  if (s < 0.25 && l < 0.3) return 'Black';
  if (h < 12 || h >= 345) return l < 0.3 ? 'Maroon' : l > 0.72 ? 'Pink' : 'Red';
  if (h < 40) {
    if (l > 0.72 || (s < 0.45 && l > 0.55)) return 'Beige';
    return l < 0.42 || s < 0.45 ? 'Brown' : 'Orange';
  }
  if (h < 66) {
    if (s < 0.45 && l > 0.55) return 'Beige';
    return l < 0.38 ? 'Olive' : 'Yellow';
  }
  if (h < 160) return h < 95 && l < 0.4 ? 'Olive' : 'Green';
  if (h < 195) return 'Teal';
  if (h < 250) return l < 0.3 ? 'Navy' : 'Blue';
  if (h < 290) return 'Purple';
  return l < 0.3 ? 'Maroon' : 'Pink';
};

// Rough skin-tone test so a model's face/arms don't win over the clothing colour
const isSkin = (r, g, b) => r > 95 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15 && Math.abs(r - g) > 15;

/**
 * @param {CanvasImageSource} source  an <img>, <canvas> or <video> frame
 * @returns {{ name: string, share: number }[]} colours ranked by weight
 */
export const detectColors = (source) => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const center = {};
  const border = {};
  let centerTotal = 0;
  let borderTotal = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const name = nameColor(r, g, b);
      const edge = x < 6 || y < 6 || x >= size - 6 || y >= size - 6;
      if (edge) {
        border[name] = (border[name] || 0) + 1;
        borderTotal++;
      }
      // Weight falls off with distance from the centre of the frame
      const dx = (x - size / 2) / (size / 2);
      const dy = (y - size / 2) / (size / 2);
      let weight = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
      if (isSkin(r, g, b)) weight *= 0.35;
      center[name] = (center[name] || 0) + weight;
      centerTotal += weight;
    }
  }

  const scores = Object.keys(center).map(name => {
    const share = center[name] / centerTotal;
    const bg = (border[name] || 0) / (borderTotal || 1);
    return { name, share, score: share - bg * 0.6 };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores.filter(s => s.share > 0.04).map(({ name, share }) => ({ name, share }));
};
