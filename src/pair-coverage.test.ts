// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FontFlux, initWoff2 } from 'font-flux-js';
import { openShapeFont, outputPath, readFont, shapeText, sourcePath } from './font.ts';
import { ligatures } from './strokes.ts';
import { strokeThemes } from './stroke-colors.ts';
import { variants } from './variants.ts';

await initWoff2();

const original = openShapeFont(readFont(sourcePath));
const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];
const inputs = [
  ...letters.flatMap(left => letters.map(right => left + right)),
  ...Object.keys(ligatures),
  '<PrismCode>',
  '  const fizz = n % 3 === 0;',
  "    fizz && buzz ? 'FizzBuzz' :",
  "    fizz ? 'Fizz' :",
  'const add = (n: number) => {',
  '  return n >= 0 ? n + 1 : 0;',
];
const shapes = inputs.map(input => {
  const glyphs = shapeText(original, input);
  const visible = glyphs.filter(({ codepoint }) => original.glyphToPath(codepoint))
    .map(({ codepoint }) => original.glyphName(codepoint));
  return { input, glyphs, visible };
});

for (const family of ['Regular', ...variants.map(theme => theme.file), ...strokeThemes.map(theme => theme.file)]) {
  test(`${family} colors every visible glyph in the ASCII letter-pair sweep and supported code samples`, () => {
    const ttf = readFont(outputPath(`fonts/PrismCode-${family}.ttf`));
    const woff2 = readFont(outputPath(`fonts/PrismCode-${family}.woff2`));
    const font = openShapeFont(ttf);
    const ttfColors = FontFlux.open(ttf).colorGlyphs;
    const woff2Colors = FontFlux.open(woff2).colorGlyphs;
    assert.deepEqual(woff2Colors, ttfColors, 'WOFF2 color assignments must match TTF');

    const colored = new Map(ttfColors.map(record => [record.name, record]));
    for (const letter of ['i', 'j', 'l']) {
      const base = colored.get(letter);
      const alternate = colored.get(`${letter}.salt_low`);
      if (alternate?.paint) {
        assert.deepEqual(alternate.paint.paint, base?.paint?.paint);
        assert.equal(alternate.paint.glyphID, alternate.name);
      } else if (alternate?.layers) {
        assert.deepEqual(alternate.layers, [{ glyph: alternate.name, paletteIndex: base?.layers?.[0].paletteIndex }]);
      }
    }
    const missing = new Map<string, string>();
    for (const { input, glyphs, visible } of shapes) {
      assert.deepEqual(shapeText(font, input), glyphs, `Shaping changed for ${JSON.stringify(input)}`);
      for (const name of visible) {
        if (!colored.has(name) && !missing.has(name)) missing.set(name, input);
      }
    }
    assert.equal(missing.size, 0, [...missing].map(([name, input]) =>
      `${name} is uncolored in ${JSON.stringify(input)}`).join('\n'));
  });
}
