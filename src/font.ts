// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs';
import { FontFlux } from 'font-flux-js';
import { Blob, Buffer as ShapeBuffer, Face, Font, shape } from 'harfbuzzjs';

export const sourcePath = new URL('../node_modules/firacode/distr/ttf/FiraCode-Regular.ttf', import.meta.url);
export const outputPath = (name: string) => new URL(`../${name}`, import.meta.url);
export const palettes = {
  sunset: ['#F43F5E', '#FB923C', '#FACC15'],
  aurora: ['#A855F7', '#34D399', '#38BDF8'],
  neon: ['#F0ABFC', '#A3E635', '#22D3EE'],
};

export function readFont(path: URL): ArrayBuffer {
  return Uint8Array.from(readFileSync(path)).buffer;
}

export function openShapeFont(bytes: ArrayBuffer): Font {
  return new Font(new Face(new Blob(bytes)));
}

export function shapeText(font: Font, text: string) {
  const buffer = new ShapeBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  shape(font, buffer);
  return buffer.getGlyphInfosAndPositions();
}

export function sfntTables(bytes: ArrayBuffer): Map<string, Buffer> {
  const sfnt = Buffer.from(bytes);
  const tables = new Map<string, Buffer>();
  for (let i = 0; i < sfnt.readUInt16BE(4); i++) {
    const entry = 12 + 16 * i;
    const tag = sfnt.toString('ascii', entry, entry + 4);
    const offset = sfnt.readUInt32BE(entry + 8);
    const length = sfnt.readUInt32BE(entry + 12);
    tables.set(tag, sfnt.subarray(offset, offset + length));
  }
  return tables;
}

export function glyphOffsets(tables: Map<string, Buffer>): number[] {
  const long = tables.get('head')!.readInt16BE(50) === 1;
  const loca = tables.get('loca')!;
  return Array.from({ length: loca.length / (long ? 4 : 2) }, (_, i) =>
    long ? loca.readUInt32BE(4 * i) : 2 * loca.readUInt16BE(2 * i));
}

// Font Flux's editable export reserializes existing glyf and layout tables.
// Keep the original glyph records and layout tables and append only the masks.
export function preserveSource(source: ArrayBuffer, edited: ArrayBuffer): FontFlux {
  const original = sfntTables(source);
  const generated = sfntTables(edited);
  const head = Buffer.from(original.get('head')!);
  head.writeInt32BE(Math.round(0.1 * 65536), 4);
  original.set('head', head);
  original.delete('DSIG'); // A source signature cannot attest to a modified font.
  for (const tag of ['name', 'COLR', 'CPAL']) {
    original.set(tag, generated.get(tag)!);
  }

  const originalCount = original.get('maxp')!.readUInt16BE(4);
  const generatedCount = generated.get('maxp')!.readUInt16BE(4);
  if (generatedCount > originalCount) {
    const originalOffsets = glyphOffsets(original);
    const generatedOffsets = glyphOffsets(generated);
    const maskStart = generatedOffsets[originalCount];
    const originalEnd = originalOffsets[originalCount];

    const glyf = Buffer.concat([
      original.get('glyf')!.subarray(0, originalEnd),
      generated.get('glyf')!.subarray(maskStart),
    ]);
    const offsets = originalOffsets.concat(
      generatedOffsets.slice(originalCount + 1).map(offset => originalEnd + offset - maskStart),
    );
    const loca = Buffer.alloc(offsets.length * 4);
    offsets.forEach((offset, i) => loca.writeUInt32BE(offset, i * 4));

    head.writeInt16BE(1, 50);
    const maxp = Buffer.from(original.get('maxp')!);
    maxp.writeUInt16BE(generatedCount, 4);
    for (const tag of ['hhea', 'hmtx', 'post']) {
      original.set(tag, generated.get(tag)!);
    }
    for (const [tag, table] of Object.entries({ glyf, loca, maxp })) {
      original.set(tag, table);
    }
  }

  const tables = Object.fromEntries(
    [...original].map(([tag, bytes]) => [tag, { _raw: Array.from(bytes) }]),
  );
  return FontFlux.fromJSON(JSON.stringify({ header: { sfVersion: 0x00010000 }, tables }));
}
