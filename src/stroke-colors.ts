// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

import { createHash } from 'node:crypto';

export const defaultStrokeSeed = 20261113;
export const defaultHueRotation = 45;

function randomColor(seed: number, theme: string, glyph: string, stroke = 0) {
  const hash = createHash('sha256').update(JSON.stringify([seed, theme, glyph, stroke])).digest();
  const unit = (offset: number) => hash.readUInt32BE(offset) / 2 ** 32;
  return { hue: unit(0) * 360, lightness: 0.70 + unit(4) * 0.10, chroma: 0.13 + unit(8) * 0.06 };
}

// OKLCH to linear sRGB via Oklab. Reduce chroma at the gamut boundary to retain hue and lightness.
function linearRgb(lightness: number, chroma: number, hue: number) {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function hexColor(lightness: number, chroma: number, hue: number): string {
  let lower = 0;
  let upper = chroma;
  let rgb = linearRgb(lightness, lower, hue);
  for (let i = 0; i < 14; i++) {
    const candidate = (lower + upper) / 2;
    const channels = linearRgb(lightness, candidate, hue);
    if (channels.every(channel => channel >= 0 && channel <= 1)) {
      lower = candidate;
      rgb = channels;
    } else {
      upper = candidate;
    }
  }
  const bytes = rgb.map(channel => Math.round(255 *
    (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055)));
  return `#${Buffer.from(bytes).toString('hex').toUpperCase()}`;
}

export function generateTrueShuffleColors(glyph: string, count: number, seed: number): string[] {
  return Array.from({ length: count }, (_, stroke) => {
    const { hue, lightness, chroma } = randomColor(seed, 'true-shuffle', glyph, stroke);
    return hexColor(lightness, chroma, hue);
  });
}

export function generateShuffleHueRotationColors(
  glyph: string, count: number, seed: number, rotation = defaultHueRotation,
): string[] {
  const { hue, lightness, chroma } = randomColor(seed, 'shuffle-hue-rotation', glyph);
  return Array.from({ length: count }, (_, stroke) => hexColor(lightness, chroma, hue + stroke * rotation));
}

export function generateShadesColors(glyph: string, count: number, seed: number): string[] {
  const { hue, lightness, chroma } = randomColor(seed, 'shades', glyph);
  const middle = 0.78 + (lightness - 0.75) * 0.25;
  return Array.from({ length: count }, (_, stroke) =>
    hexColor(middle + (count === 1 ? 0 : 0.16 * (stroke / (count - 1) - 0.5)), chroma, hue));
}

export const strokeThemes = [
  { file: 'TrueShuffle', slug: 'true-shuffle', name: 'True Shuffle', generate: generateTrueShuffleColors },
  { file: 'ShuffleHueRotation', slug: 'shuffle-hue-rotation', name: 'Shuffle Hue Rotation', generate: generateShuffleHueRotationColors },
  { file: 'Shades', slug: 'shades', name: 'Shades', generate: generateShadesColors },
];
