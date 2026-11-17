// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FontFlux, initWoff2 } from 'font-flux-js';
import { openShapeFont, outputPath, readFont, sfntTables, shapeText, sourcePath } from './font.ts';
import { ligatures } from './strokes.ts';
import { ligatureColors, variants } from './variants.ts';

await initWoff2();
const source = readFont(sourcePath);
const original = openShapeFont(source);
const sourceFont = FontFlux.open(source);
const printable = Array.from({ length: 94 }, (_, index) => String.fromCharCode(33 + index)).join('');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function glyphColor(font: FontFlux, name: string): string {
  const layers = font.getColorGlyph(name)?.layers;
  assert.equal(layers?.length, 1, name);
  assert.equal(layers[0].glyph, name);
  return font.palettes[0][layers[0].paletteIndex].toUpperCase();
}

function characterColor(font: FontFlux, character: string): string {
  return glyphColor(font, original.glyphName(original.nominalGlyph(character.codePointAt(0)!)!));
}

const families = Object.fromEntries(variants.map(({ file }) =>
  [file, FontFlux.open(readFont(outputPath(`fonts/PrismCode-${file}.ttf`)))]));

for (const { file, slug, name, characters } of variants) {
  test(`${name} ships identical single-layer color assignments in valid TTF and WOFF2 files`, () => {
    for (const extension of ['ttf', 'woff2']) {
      const bytes = readFont(outputPath(`fonts/PrismCode-${file}.${extension}`));
      const font = FontFlux.open(bytes);
      assert.deepEqual(FontFlux.diagnose(bytes).errors, []);
      assert.equal(font.info.familyName, `PrismCode ${name}`);
      assert.equal(font.info.styleName, 'Regular');
      assert.equal(font.info.postScriptName, `PrismCode-${file}`);
      assert.match(String(font.info.copyright), /Fira Code Project Authors/);
      assert.equal(font.tables!.COLR.version, 0);
      assert.equal(font.palettes.length, 1);
      assert.equal(font.colorGlyphs.length, 182);
      assert.deepEqual(font.colorGlyphs, families[file].colorGlyphs);
      assert.deepEqual(font.palettes, families[file].palettes);
      assert.deepEqual(font.glyphs, sourceFont.glyphs);

      for (const character of printable) {
        assert.equal(characterColor(font, character), characters.get(character), character);
      }
      for (const [sequence, rules] of Object.entries(ligatures)) {
        for (const glyph of Object.keys(rules)) {
          assert.equal(glyphColor(font, glyph), ligatureColors[sequence], sequence);
        }
      }
      assert.equal(font.getColorGlyph(original.glyphName(original.nominalGlyph(0x3bb)!)), undefined);
    }
  });

  test(`${name} retains original tables, shaping, and a path-only SVG preview`, () => {
    const bytes = readFont(outputPath(`fonts/PrismCode-${file}.ttf`));
    const before = sfntTables(source);
    const after = sfntTables(bytes);
    for (const [tag, table] of before) {
      if (!['head', 'name', 'DSIG'].includes(tag)) assert.deepEqual(after.get(tag), table, tag);
    }
    const font = openShapeFont(bytes);
    for (const sample of [printable, ...Object.keys(ligatures), 'const café = (λ: number) => λ >= 0;']) {
      assert.deepEqual(shapeText(font, sample), shapeText(original, sample), sample);
    }
    const svg = readFileSync(outputPath(`previews/${slug}.svg`), 'utf8');
    assert.match(svg, /Aa Bb Cc.*Ll Mm\nNn Oo Pp.*Yy Zz\n0123456789/);
    assert.match(svg, /const add/);
    assert.doesNotMatch(svg, /<text\b|<image\b|<clipPath\b/);
    assert.ok(svg.includes(characterColor(families[file], 'A')));
  });
}

test('Spectrum assigns 26 distinct alphabet colors and Spectrum Mirror reverses lowercase', () => {
  const normal = [...alphabet].map(letter => characterColor(families.Spectrum, letter));
  assert.equal(new Set(normal).size, 26);
  assert.equal(normal[0], '#FF6678');
  assert.equal(normal.at(-1), '#FF76BC');
  for (const [index, letter] of [...alphabet].entries()) {
    assert.equal(characterColor(families.Spectrum, letter.toLowerCase()), normal[index]);
    assert.equal(characterColor(families.SpectrumMirror, letter), normal[index]);
    assert.equal(characterColor(families.SpectrumMirror, letter.toLowerCase()), normal[25 - index]);
  }
});

test('Dvorak and Qwerty follow physical key positions with distinct neighboring colors', () => {
  const rows = [
    ['`1234567890[]', '`1234567890-='],
    ["',.pyfgcrl/=\\", 'qwertyuiop[]\\'],
    ['aoeuidhtns-', "asdfghjkl;'"],
    [';qjkxbmwvz', 'zxcvbnm,./'],
  ];
  for (const [index, [dvorak, qwerty]] of rows.entries()) {
    for (const [column, dvorakKey] of [...dvorak].entries()) {
      assert.equal(characterColor(families.Dvorak, dvorakKey), characterColor(families.Qwerty, qwerty[column]));
    }
    for (const [family, keyRow, nextRow] of [
      [families.Dvorak, dvorak, rows[index + 1]?.[0] ?? ''],
      [families.Qwerty, qwerty, rows[index + 1]?.[1] ?? ''],
    ] as const) {
      for (const [column, key] of [...keyRow].entries()) {
        const color = characterColor(family, key);
        assert.equal(color, characterColor(family, key.toUpperCase()));
        for (const nearby of keyRow.slice(column + 1, column + 4) + nextRow) {
          assert.notEqual(color, characterColor(family, nearby), `${key} and ${nearby}`);
        }
      }
      assert.equal(characterColor(family, '1'), characterColor(family, '!'));
      assert.equal(characterColor(family, '['), characterColor(family, '{'));
    }
  }
});
