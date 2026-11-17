// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FontFlux, initWoff2 } from 'font-flux-js';
import { PaintFuncs } from 'harfbuzzjs';
import { glyphOffsets, openShapeFont, outputPath, palettes, readFont, shapeText, sourcePath, sfntTables } from './font.ts';
import { ascii, ligatures } from './strokes.ts';

await initWoff2();
const source = readFont(sourcePath);
const ttf = readFont(outputPath('fonts/PrismCode-Regular.ttf'));
const sourceFont = FontFlux.open(source);
const original = openShapeFont(source);
const prism = openShapeFont(ttf);

const expectedPalettes = [
  ['#f43f5e', '#fb923c', '#facc15'],
  ['#a855f7', '#34d399', '#38bdf8'],
  ['#f0abfc', '#a3e635', '#22d3ee'],
  ['#bae6fd', '#60a5fa', '#22d3ee'],
];

const plainAscii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join('');

for (const extension of ['ttf', 'woff2']) {
  const bytes = readFont(outputPath(`fonts/PrismCode-Regular.${extension}`));
  const font = FontFlux.open(bytes);

  test(`${extension} is valid and contains exactly four palettes and COLRv1 paints`, () => {
    assert.deepEqual(FontFlux.diagnose(bytes).errors, []);
    assert.equal(font.info.familyName, 'PrismCode');
    assert.equal(font.info.styleName, 'Regular');
    assert.equal(font.info.postScriptName, 'PrismCode-Regular');
    assert.match(font.info.copyright as string, /The Fira Code Project Authors/);
    assert.match(font.info.copyright as string, /Full Stack Craft LLC/);
    assert.match(font.info.license as string, /SIL Open Font License, Version 1.1/);
    assert.deepEqual(font.palettes, expectedPalettes);
    assert.equal(font.tables!.COLR.version, 1);
    assert.equal(font.colorGlyphs.length, 120);
    if (extension === 'woff2') {
      assert.deepEqual(font.colorGlyphs, FontFlux.open(ttf).colorGlyphs);
    }
  });

  test(`${extension} has explicit clip bounds for every painted glyph`, () => {
    type ClipRecord = {
      startGlyphID: number;
      endGlyphID: number;
      clipBox: { format: number; xMin: number; yMin: number; xMax: number; yMax: number };
    };
    const clipList = font.tables!.COLR.clipList as { format: number; clips: ClipRecord[] };
    assert.equal(clipList.format, 1);
    const expected = font.colorGlyphs.map(({ name }) => font.glyphs.findIndex(glyph => glyph.name === name))
      .sort((a, b) => a - b);
    assert.deepEqual(clipList.clips.map(clip => clip.startGlyphID), expected);
    for (const { startGlyphID, endGlyphID, clipBox } of clipList.clips) {
      const { xBearing, yBearing, width, height } = original.glyphExtents(startGlyphID)!;
      assert.equal(endGlyphID, startGlyphID);
      assert.deepEqual(clipBox, {
        format: 1, xMin: xBearing - 1, yMin: yBearing + height - 1,
        xMax: xBearing + width + 1, yMax: yBearing + 1,
      });
    }
  });

  test(`${extension} preserves every original glyph outline, instruction and metric`, () => {
    for (let i = 0; i < sourceFont.glyphCount; i++) {
      assert.deepEqual(font.glyphs[i], sourceFont.glyphs[i], `glyph ${i}`);
    }
    assert.equal(font.info.unitsPerEm, sourceFont.info.unitsPerEm);
    assert.equal(font.info.ascender, sourceFont.info.ascender);
    assert.equal(font.info.descender, sourceFont.info.descender);
  });
}

test('original glyph records and OpenType layout tables survive byte for byte', () => {
  const before = sfntTables(source);
  const after = sfntTables(ttf);
  for (const tag of ['cmap', 'GSUB', 'GPOS', 'GDEF', 'OS/2', 'cvt ', 'prep', 'fpgm', 'gasp']) {
    assert.deepEqual(after.get(tag), before.get(tag), tag);
  }
  const offsets = glyphOffsets(before);
  assert.deepEqual(glyphOffsets(after).slice(0, offsets.length), offsets);
  const originalEnd = offsets.at(-1);
  assert.deepEqual(after.get('glyf')!.subarray(0, originalEnd), before.get('glyf')!.subarray(0, originalEnd));
});

test('HarfBuzz shapes normal text, programming ligatures and fallback glyphs identically', () => {
  const font = FontFlux.open(ttf);
  for (const text of [plainAscii, ...Object.keys(ligatures), 'let café = λ + Ω;', 'Привет → √']) {
    assert.deepEqual(shapeText(prism, text), shapeText(original, text), text);
  }
  for (const [sequence, glyphs] of Object.entries(ligatures)) {
    const shaped = shapeText(prism, sequence).map(glyph => prism.glyphName(glyph.codepoint));
    for (const name of Object.keys(glyphs)) {
      assert.ok(shaped.includes(name) && font.getColorGlyph(name), sequence);
    }
  }
  for (const character of 'λΩéЖ√') {
    const glyphId = prism.nominalGlyph(character.codePointAt(0)!)!;
    assert.ok(glyphId && prism.glyphToPath(glyphId), character);
    assert.equal(font.getColorGlyph(prism.glyphName(glyphId)), undefined);
  }
});

test('HarfBuzz evaluates the original silhouette clip and independent solid fills', () => {
  const font = FontFlux.open(ttf);
  for (const character of plainAscii.slice(1)) {
    assert.ok(ascii[character], character);
    const glyphId = prism.nominalGlyph(character.codePointAt(0)!)!;
    const name = prism.glyphName(glyphId);
    const paint = font.getColorGlyph(name)?.paint;
    assert.equal(paint?.format, 10, character);
    assert.equal(paint?.glyphID, name, character);
  }
  for (const [character, indices] of Object.entries({
    A: [0, 1, 2], H: [0, 1, 2], M: [0, 1, 2], E: [0, 1, 2],
    '0': [0, 2], '{': [0, 1, 2], '}': [0, 1, 2], '+': [0, 2],
  })) {
    for (const [paletteIndex, palette] of expectedPalettes.entries()) {
      const paints = new PaintFuncs();
      const colors = new Set<string>();
      paints.setColorFunc((_foreground, { red, green, blue, alpha }) => {
        assert.equal(alpha, 255);
        colors.add(`#${Buffer.from([red, green, blue]).toString('hex')}`);
      });
      assert.ok(prism.paintGlyphOrFail(prism.nominalGlyph(character.codePointAt(0)!)!,
        paints, undefined, paletteIndex));
      assert.deepEqual(colors, new Set(indices.map(index => palette[index])), character);
    }
  }
});

test('SVG previews contain the same outlines and use their respective palette', () => {
  const paths = Object.keys(palettes).map((name, i) => {
    const svg = readFileSync(outputPath(`previews/${name}.svg`), 'utf8');
    assert.doesNotMatch(svg, /<text\b|font-family|<image\b/);
    for (const color of expectedPalettes[i]) assert.ok(svg.includes(color.toUpperCase()));
    return [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
  });
  assert.ok(paths[0].length > 50);
  for (const outlinePaths of paths.slice(1)) {
    assert.deepEqual(outlinePaths, paths[0]);
  }
});
