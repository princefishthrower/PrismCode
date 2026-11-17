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
const printableAscii = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index));
const pairs = printableAscii.flatMap(left => printableAscii.map(right => left + right));
const inputs = [
  ...pairs,
  ...Object.keys(ligatures),
  '<PrismCode>',
  '<Component/>',
  '<Component />',
  '</Component>',
  '  const fizz = n % 3 === 0;',
  "    fizz && buzz ? 'FizzBuzz' :",
  "    fizz ? 'Fizz' :",
  'const add = (n: number) => {',
  '  return n >= 0 ? n + 1 : 0;',
];
const shapes = new Map([...new Set(inputs)].map(input => {
  const glyphs = shapeText(original, input);
  const visible = glyphs.filter(({ codepoint }) => original.glyphToPath(codepoint))
    .map(({ codepoint }) => original.glyphName(codepoint));
  return [input, { glyphs, visible }];
}));

for (const family of ['Regular', ...variants.map(theme => theme.file), ...strokeThemes.map(theme => theme.file)]) {
  test(`${family} preserves shaping for all printable ASCII pairs and colors every visible glyph`, () => {
    const ttf = readFont(outputPath(`fonts/PrismCode-${family}.ttf`));
    const woff2 = readFont(outputPath(`fonts/PrismCode-${family}.woff2`));
    const font = openShapeFont(ttf);
    const ttfFont = FontFlux.open(ttf);
    const woff2Font = FontFlux.open(woff2);
    assert.deepEqual(woff2Font.colorGlyphs, ttfFont.colorGlyphs, 'WOFF2 color assignments must match TTF');
    assert.deepEqual(woff2Font.palettes, ttfFont.palettes, 'WOFF2 palettes must match TTF');
    for (const tag of ['cmap', 'GDEF', 'GPOS', 'GSUB', 'hhea', 'hmtx', 'maxp']) {
      assert.deepEqual(woff2Font.tables?.[tag], ttfFont.tables?.[tag], `WOFF2 ${tag} must match TTF`);
    }

    const colored = new Map(ttfFont.colorGlyphs.map(record => [record.name, record]));
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
    for (const [input, { glyphs, visible }] of shapes) {
      assert.deepEqual(shapeText(font, input), glyphs, `Shaping changed for ${JSON.stringify(input)}`);
      for (const name of visible) {
        if (!colored.has(name) && !missing.has(name)) missing.set(name, input);
      }
    }

    assert.deepEqual(
      [...missing].map(([name, input]) => `${name} is uncolored in ${JSON.stringify(input)}`),
      [],
      'Every visible glyph in the sweep must render in color',
    );
  });
}
