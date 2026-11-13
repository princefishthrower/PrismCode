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
const requiredColorInputs = [
  ...pairs.filter(pair => /^[A-Za-z]{2}$/.test(pair)),
  ...Object.keys(ligatures),
  '<PrismCode>',
  '  const fizz = n % 3 === 0;',
  "    fizz && buzz ? 'FizzBuzz' :",
  "    fizz ? 'Fizz' :",
  'const add = (n: number) => {',
  '  return n >= 0 ? n + 1 : 0;',
];
const shapes = new Map([...new Set([...pairs, ...requiredColorInputs])].map(input => {
  const glyphs = shapeText(original, input);
  const visible = glyphs.filter(({ codepoint }) => original.glyphToPath(codepoint))
    .map(({ codepoint }) => original.glyphName(codepoint));
  return [input, { glyphs, visible }];
}));

// One representative pair per visible glyph that currently uses monochrome fallback.
const knownFallbacks = {
  "asciicircum_equal.liga": "^=",
  "asciitilde_asciitilde.liga": "~~",
  "asciitilde_at.liga": "~@",
  "asciitilde_greater.liga": "~>",
  "asciitilde_hyphen.liga": "~-",
  "asterisk.lc": "*a",
  "asterisk_greater.liga": "*>",
  "backslash_slash.liga": "\\/",
  "bar_braceright.liga": "|}",
  "bar_bracketright.liga": "|]",
  "bar_equal_end.seq": "=|",
  "bar_greater.liga": "|>",
  "bar_hyphen_end.seq": "-|",
  "bar_hyphen_start.seq": "|-",
  "braceleft_bar.liga": "{|",
  "bracketleft_bar.liga": "[|",
  "bracketright_numbersign.liga": "]#",
  "colon.center": ":<",
  "colon.uc": "(:",
  "colon_equal.liga": ":=",
  "dollar_greater.liga": "$>",
  "equal_end.seq": "/=",
  "exclam_exclam.liga": "!!",
  "grave.case": "A`",
  "greater.center": ":>",
  "greater_greater.liga": ">>",
  "greater_hyphen_start.seq": ">-",
  "hyphen.lc": "-a",
  "hyphen_asciitilde.liga": "-~",
  "less.center": ":<",
  "less_asciitilde.liga": "<~",
  "less_asterisk.liga": "<*",
  "less_bar.liga": "<|",
  "less_dollar.liga": "<$",
  "less_greater.liga": "<>",
  "less_hyphen_end.seq": "-<",
  "less_less.liga": "<<",
  "less_plus.liga": "<+",
  "less_slash.liga": "</",
  "numbersign_braceleft.liga": "#{",
  "numbersign_bracketleft.liga": "#[",
  "numbersign_colon.liga": "#:",
  "numbersign_end.seq": "##",
  "numbersign_equal.liga": "#=",
  "numbersign_exclam.liga": "#!",
  "numbersign_parenleft.liga": "#(",
  "numbersign_question.liga": "#?",
  "numbersign_start.seq": "##",
  "numbersign_underscore.liga": "#_",
  "percent_percent.liga": "%%",
  "period_period.liga": "..",
  "period_question.liga": ".?",
  "plus.lc": "+a",
  "plus_greater.liga": "+>",
  "question_equal.liga": "?=",
  "question_period.liga": "?.",
  "semicolon_semicolon.liga": ";;",
  "slash_backslash.liga": "/\\",
  "slash_equal_start.seq": "/=",
  "slash_greater.liga": "/>",
  "underscore_end.seq": "__",
  "underscore_start.seq": "__"
};

for (const family of ['Regular', ...variants.map(theme => theme.file), ...strokeThemes.map(theme => theme.file)]) {
  test(`${family} preserves shaping for all printable ASCII pairs and tracks color coverage`, () => {
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

    const missingRequired = requiredColorInputs.flatMap(input =>
      shapes.get(input)!.visible.filter(name => !colored.has(name))
        .map(name => `${name} is uncolored in ${JSON.stringify(input)}`));
    assert.deepEqual([...new Set(missingRequired)], [], 'Required glyphs must render in color');

    assert.deepEqual(Object.fromEntries(missing), knownFallbacks,
      'ASCII color coverage changed. Review the glyph names and representative pairs.');
  });
}
