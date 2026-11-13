// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FontFlux, initWoff2 } from 'font-flux-js';
import { PaintFuncs } from 'harfbuzzjs';
import { openShapeFont, outputPath, readFont, sfntTables, shapeText, sourcePath } from './font.ts';
import { defaultStrokeSeed, generateShadesColors, generateShuffleHueRotationColors,
  generateTrueShuffleColors, strokeThemes } from './stroke-colors.ts';
import { ligatures } from './strokes.ts';

function linearChannels(hex: string) {
  assert.match(hex, /^#[0-9A-F]{6}$/i);
  return [...Buffer.from(hex.slice(1), 'hex')].map(byte => {
    const channel = byte / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
}

function luminance([r, g, b]: number[]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function oklch(hex: string) {
  const [r, g, b] = linearChannels(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const yellow = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return {
    lightness: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    hue: (Math.atan2(yellow, a) * 180 / Math.PI + 360) % 360,
  };
}

const hueStep = (from: number, to: number) => (to - from + 360) % 360;
const seedValue = process.env.PRISMCODE_SEED;
const seed = seedValue === undefined ? defaultStrokeSeed : Number(seedValue);

test('seed and glyph identity control color deterministically, with contrast on the preview background', () => {
  const background = luminance(linearChannels('#12151E'));
  for (const { generate } of strokeThemes) {
    for (let i = 0; i < 100; i++) {
      const glyph = `glyph-${i}`;
      const colors = generate(glyph, 3, seed);
      assert.deepEqual(colors, generate(glyph, 3, seed));
      assert.notDeepEqual(colors, generate(glyph, 3, seed === 0 ? 1 : 0));
      assert.notDeepEqual(colors, generate(`${glyph}.alternate`, 3, seed));
      for (const color of colors) {
        assert.ok((luminance(linearChannels(color)) + 0.05) / (background + 0.05) >= 4.5, color);
      }
    }
  }
});

test('True Shuffle draws independent colors for each stroke', () => {
  const colors = generateTrueShuffleColors('A', 3, defaultStrokeSeed);
  assert.equal(new Set(colors).size, 3);
  assert.deepEqual(colors, generateTrueShuffleColors('A', 4, defaultStrokeSeed).slice(0, 3));
  const [first, second, third] = colors.map(oklch);
  assert.ok(Math.abs(hueStep(first.hue, second.hue) - hueStep(second.hue, third.hue)) > 5);
});

test('Shuffle Hue Rotation keeps lightness steady and rotates hue by the configured step', () => {
  for (const rotation of [45, 90]) {
    const [first, second, third] = generateShuffleHueRotationColors('A', 3, defaultStrokeSeed, rotation).map(oklch);
    assert.ok(Math.abs(hueStep(first.hue, second.hue) - rotation) < 2);
    assert.ok(Math.abs(hueStep(second.hue, third.hue) - rotation) < 2);
    assert.ok(Math.abs(first.lightness - second.lightness) < 0.003);
    assert.ok(Math.abs(second.lightness - third.lightness) < 0.003);
  }
});

test('Shades keeps hue steady and increases lightness from stroke to stroke', () => {
  const [dark, middle, light] = generateShadesColors('A', 3, defaultStrokeSeed).map(oklch);
  assert.ok(Math.min(hueStep(dark.hue, light.hue), hueStep(light.hue, dark.hue)) < 2);
  assert.ok(Math.min(hueStep(dark.hue, middle.hue), hueStep(middle.hue, dark.hue)) < 2);
  assert.ok(middle.lightness - dark.lightness > 0.07);
  assert.ok(light.lightness - middle.lightness > 0.07);
});

await initWoff2();
const source = readFont(sourcePath);
const original = openShapeFont(source);
const originalGlyphs = FontFlux.open(source).glyphs;
const regular = FontFlux.open(readFont(outputPath('fonts/PrismCode-Regular.ttf')));
const sourceTables = sfntTables(source);

for (const { file, slug, name, generate } of strokeThemes) {
  test(`${name} embeds seeded stroke colors in both fonts and its SVG specimen`, () => {
    const ttf = readFont(outputPath(`fonts/PrismCode-${file}.ttf`));
    const generated = FontFlux.open(ttf);
    for (const extension of ['ttf', 'woff2']) {
      const bytes = readFont(outputPath(`fonts/PrismCode-${file}.${extension}`));
      const font = FontFlux.open(bytes);
      assert.deepEqual(FontFlux.diagnose(bytes).errors, []);
      assert.equal(font.info.familyName, `PrismCode ${name}`);
      assert.equal(font.info.postScriptName, `PrismCode-${file}`);
      assert.equal(font.tables!.COLR.version, 1);
      assert.deepEqual(font.tables!.COLR.clipList, regular.tables!.COLR.clipList);
      assert.equal(font.palettes.length, 1);
      assert.deepEqual(font.palettes, generated.palettes);
      assert.deepEqual(font.colorGlyphs, generated.colorGlyphs);
      assert.deepEqual(font.glyphs, regular.glyphs);
      assert.deepEqual(font.glyphs.slice(0, originalGlyphs.length), originalGlyphs);
    }

    const font = openShapeFont(ttf);
    const tables = sfntTables(ttf);
    for (const tag of ['cmap', 'GSUB', 'GPOS', 'GDEF']) {
      assert.deepEqual(tables.get(tag), sourceTables.get(tag));
    }
    for (const sample of [...Object.keys(ligatures), 'const add = (n: number) => n + 1;', 'é λ']) {
      assert.deepEqual(shapeText(font, sample), shapeText(original, sample));
    }
    assert.equal(generated.getColorGlyph(original.glyphName(original.nominalGlyph(0x3bb)!)), undefined);

    const svg = readFileSync(outputPath(`previews/${slug}.svg`), 'utf8');
    assert.match(svg, /Aa Bb Cc.*Ll Mm\nNn Oo Pp.*Yy Zz\n0123456789/);
    assert.match(svg, /const add/);
    assert.doesNotMatch(svg, /<text\b|<image\b/);
    for (const glyph of ['A', 'H', 'M', 'E']) {
      const colors = new Set<string>();
      const paints = new PaintFuncs();
      paints.setColorFunc((_foreground, { red, green, blue }) => {
        colors.add(`#${Buffer.from([red, green, blue]).toString('hex').toUpperCase()}`);
      });
      assert.ok(font.paintGlyphOrFail(font.nominalGlyph(glyph.codePointAt(0)!)!, paints));
      assert.deepEqual(colors, new Set(generate(glyph, 3, seed)));
      for (const color of colors) assert.ok(svg.includes(`fill="${color}"`));
    }
  });
}
