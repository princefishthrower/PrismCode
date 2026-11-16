// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { FontFlux, initWoff2 } from 'font-flux-js';
import type { Font } from 'harfbuzzjs';
import { openShapeFont, outputPath, palettes, preserveSource, readFont, shapeText, sourcePath } from './font.ts';
import { ascii, ligatures, maskPath } from './strokes.ts';
import type { Mask, Strokes } from './strokes.ts';
import { ligatureColors, variants } from './variants.ts';
import { defaultStrokeSeed, strokeThemes } from './stroke-colors.ts';

const specimen = [
  ["Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm", 18, 70],
  ["Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz", 18, 108],
  ["0123456789", 28, 190],
  ["! @ # $ % ^ & * ( ) - _ + =", 22, 265],
  ["[ ] { } \\ | / ? < > : ; ' \"", 22, 303],
  ["const add = (n: number) => {", 21, 390],
  ["  return n >= 0 ? n + 1 : 0;", 21, 428],
  ["};", 21, 466],
] as const;

const solid = (paletteIndex: number) => ({ format: 2, paletteIndex, alpha: 1 });
const clip = (glyphID: string, paint: Record<string, unknown>) => ({ format: 10, glyphID, paint });

type GlyphPaint = { base: number; masks: readonly (Omit<Mask, 'color'> & { color: number })[] };

function addPaints(font: FontFlux, glyphStrokes: ReadonlyMap<number, GlyphPaint>) {
  const maskNames = new Map<string, string>();
  for (const [glyphId, { base, masks }] of glyphStrokes) {
    let paint: Record<string, unknown> = solid(base);
    for (const mask of masks) {
      const path = maskPath(mask);
      let name = maskNames.get(path);
      if (!name) {
        name = `prism.mask.${maskNames.size}`;
        font.addGlyph({
          name,
          advanceWidth: 1200,
          leftSideBearing: Math.min(...mask.points.map(([x]) => x)),
          contours: FontFlux.svgToContours(path),
        });
        maskNames.set(path, name);
      }
      paint = {
        format: 32,
        compositeMode: 3, // SRC_OVER
        sourcePaint: clip(name, solid(mask.color)),
        backdropPaint: paint,
      };
    }
    const name = font.glyphs[glyphId].name;
    font.addColorGlyph({ name, paint: clip(name, paint) });
  }
}

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function preview(
  font: Font, glyphStrokes: ReadonlyMap<number, { base: number; masks?: GlyphPaint['masks'] }>,
  name: string, colors: string[],
) {
  const definitions = new Map<number, string>();
  const groups = specimen.map(([line, size, y]) => {
    const scale = size / font.face.upem;
    let x = 0;
    const glyphs = [];
    for (const { codepoint, xAdvance = 0, xOffset = 0, yOffset = 0 } of shapeText(font, line)) {
      const path = font.glyphToPath(codepoint);
      if (path) {
        const strokes = glyphStrokes.get(codepoint);
        const base = strokes ? colors[strokes.base] : '#E2E8F0';
        const masks = strokes?.masks ?? [];
        if (masks.length && !definitions.has(codepoint)) {
          definitions.set(codepoint, `    <clipPath id="g${codepoint}"><path d="${path}"/></clipPath>`);
        }
        const layers = masks.map(mask => `<path fill="${colors[mask.color]}" d="${maskPath(mask)}"/>`).join('');
        const overlay = layers ? `<g clip-path="url(#g${codepoint})">${layers}</g>` : '';
        glyphs.push(`      <g transform="translate(${x + xOffset} ${yOffset})"><path fill="${base}" d="${path}"/>${overlay}</g>`);
      }
      x += xAdvance;
    }
    return `    <g transform="translate(26 ${y}) scale(${scale} -${scale})">\n${glyphs.join('\n')}\n    </g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 530" width="460" height="530" role="img" aria-labelledby="title description">
  <!-- Glyph outlines derived from Fira Code under SIL OFL 1.1. See ../OFL.txt. -->
  <title id="title">PrismCode — ${name}</title>
  <desc id="description">${escapeXml(specimen.map(([line]) => line).join('\n'))}</desc>
  <defs>
${[...definitions.values()].join('\n')}
  </defs>
  <rect width="460" height="530" rx="18" fill="#12151E"/>
${groups.join('\n')}
</svg>
`;
}

const seedValue = process.env.PRISMCODE_SEED;
const seed = seedValue === undefined ? defaultStrokeSeed : Number(seedValue);
if ((seedValue !== undefined && !/^-?\d+$/.test(seedValue)) || !Number.isSafeInteger(seed)) {
  throw new Error('PRISMCODE_SEED must be a safe integer');
}

const source = readFont(sourcePath);
const sourceHash = createHash('sha256').update(new Uint8Array(source)).digest('hex');
if (sourceHash !== '5992ab9640e2df491b2f609467b1de60e8bc39b2c28db184342a0592d98f6117') {
  throw new Error('Expected the pinned Fira Code 6.2 Regular TTF');
}
const original = openShapeFont(source);
const font = FontFlux.open(source);
const glyphStrokes = new Map<number, Strokes>();
for (const [character, strokes] of Object.entries(ascii)) {
  const glyphId = original.nominalGlyph(character.codePointAt(0)!);
  if (!glyphId) throw new Error(`Missing ASCII glyph for ${character}`);
  glyphStrokes.set(glyphId, strokes);
}
const ligatureGlyphIds = new Map<number, string>();
for (const [sequence, rules] of Object.entries(ligatures)) {
  const shaped = new Map(shapeText(original, sequence).map(({ codepoint }) =>
    [original.glyphName(codepoint), codepoint]));
  for (const [name, strokes] of Object.entries(rules)) {
    const glyphId = shaped.get(name);
    if (glyphId === undefined) throw new Error(`Expected ${name} when shaping ${sequence}`);
    glyphStrokes.set(glyphId, strokes);
    ligatureGlyphIds.set(glyphId, sequence);
  }
}

const alternateLetters = new Map<number, string>();
for (const [name, letter] of [['i.salt_low', 'i'], ['j.salt_low', 'j'], ['l.salt_low', 'l']]) {
  const glyphId = font.glyphs.findIndex(glyph => glyph.name === name);
  if (glyphId < 0) throw new Error(`Missing contextual alternate ${name}`);
  alternateLetters.set(glyphId, letter);
  glyphStrokes.set(glyphId, ascii[letter]);
}

function rename(font: FontFlux, family: string, file: string) {
  delete font.tables!.DSIG;
  font.setInfo({
    copyright: `${font.info.copyright}\nPrismCode modifications copyright (c) 2026 Full Stack Craft LLC`,
    familyName: family,
    fullName: `${family} Regular`,
    postScriptName: `PrismCode-${file}`,
    uniqueID: `0.100;PrismCode-${file}`,
    version: 'Version 0.100',
    vendorURL: 'https://github.com/princefishthrower/PrismCode',
  });
}

rename(font, 'PrismCode', 'Regular');
for (const colors of Object.values(palettes)) font.addPalette(colors);
addPaints(font, glyphStrokes);

function preserveStrokeFont(font: FontFlux) {
  const painted = FontFlux.open(font.export());
  const colr = painted.tables!.COLR;
  // Explicit raster bounds prevent Firefox from dropping strokes in nested clips.
  colr.clipList = {
    format: 1,
    clips: [...glyphStrokes.keys()].sort((a, b) => a - b).map(glyphId => {
      const { xBearing, yBearing, width, height } = original.glyphExtents(glyphId)!;
      return {
        startGlyphID: glyphId,
        endGlyphID: glyphId,
        clipBox: {
          format: 1,
          xMin: xBearing - 1,
          yMin: yBearing + height - 1,
          xMax: xBearing + width + 1,
          yMax: yBearing + 1,
        },
      };
    }),
  };
  // Use the table-level COLR data to retain the clip list on export.
  delete painted.data.colorGlyphs;
  return preserveSource(source, painted.export());
}

const preserved = preserveStrokeFont(font);
await initWoff2();
// Start from empty output directories so a renamed or removed family leaves no stale file behind.
for (const directory of ['fonts', 'previews']) {
  rmSync(outputPath(directory), { recursive: true, force: true });
  mkdirSync(outputPath(directory));
}
function writeFont(font: FontFlux, file: string) {
  for (const [extension, format] of [['ttf', 'sfnt'], ['woff2', 'woff2']] as const) {
    writeFileSync(outputPath(`fonts/PrismCode-${file}.${extension}`), Buffer.from(font.export({ format })));
  }
}

writeFont(preserved, 'Regular');
for (const [name, colors] of Object.entries(palettes)) {
  writeFileSync(outputPath(`previews/${name}.svg`), preview(original, glyphStrokes, name, colors));
}
console.log(`Built PrismCode Regular with ${glyphStrokes.size} color glyphs.`);

for (const { file, slug, name, characters } of variants) {
  const variant = FontFlux.open(source);
  rename(variant, `PrismCode ${name}`, file);

  const colors = [...new Set([...characters.values(), ...Object.values(ligatureColors)])];
  const glyphColors = new Map<number, { base: number }>();
  for (const [character, color] of characters) {
    glyphColors.set(original.nominalGlyph(character.codePointAt(0)!)!, { base: colors.indexOf(color) });
  }
  for (const [glyphId, sequence] of ligatureGlyphIds) {
    glyphColors.set(glyphId, { base: colors.indexOf(ligatureColors[sequence]) });
  }
  for (const [glyphId, letter] of alternateLetters) {
    glyphColors.set(glyphId, { base: colors.indexOf(characters.get(letter)!) });
  }
  variant.addPalette(colors);
  for (const [glyphId, { base }] of glyphColors) {
    const name = variant.glyphs[glyphId].name;
    variant.addColorGlyph({ name, layers: [{ glyph: name, paletteIndex: base }] });
  }

  writeFont(preserveSource(source, variant.export()), file);
  writeFileSync(outputPath(`previews/${slug}.svg`), preview(original, glyphColors, name, colors));
  console.log(`Built PrismCode ${name} with ${glyphColors.size} solid-color glyphs.`);
}

for (const { file, slug, name, generate } of strokeThemes) {
  const theme = FontFlux.open(source);
  rename(theme, `PrismCode ${name}`, file);

  const palette = new Map<string, number>();
  const paints = new Map<number, GlyphPaint>();
  for (const [glyphId, { masks }] of glyphStrokes) {
    const glyph = alternateLetters.get(glyphId) ?? original.glyphName(glyphId);
    const indices = generate(glyph, masks.length + 1, seed).map(color => {
      if (!palette.has(color)) palette.set(color, palette.size);
      return palette.get(color)!;
    });
    paints.set(glyphId, {
      base: indices[0],
      masks: masks.map((mask, i) => ({ ...mask, color: indices[i + 1] })),
    });
  }

  const colors = [...palette.keys()];
  theme.addPalette(colors);
  addPaints(theme, paints);
  writeFont(preserveStrokeFont(theme), file);
  writeFileSync(outputPath(`previews/${slug}.svg`), preview(original, paints, name, colors));
  console.log(`Built PrismCode ${name} with seed ${seed}.`);
}
