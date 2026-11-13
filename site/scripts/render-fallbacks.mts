// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

// Browsers without COLRv1 (Safari, and every browser on iOS) draw the stroke
// themes as plain outlines. For them, this script draws each website specimen
// in app/specimens.json to an SVG. HarfBuzz shapes the text and walks each
// font's own COLR paint graph, so the SVGs come from the fonts in ../fonts and
// not from a second copy of the color rules.
//
// Writes public/fallbacks/<font>-<palette>-<specimen>.svg plus manifest.json,
// which app/color-text.tsx reads to size and place each SVG.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { Blob, Buffer as ShapeBuffer, Face, Font, PaintCompositeMode, PaintFuncs, shape } from 'harfbuzzjs';
import type { Color } from 'harfbuzzjs';

type Specimen = { fonts?: string[]; color: string; lineHeight: number; lines: string[] };
type Rect = [xMin: number, yMin: number, xMax: number, yMax: number];
type Container =
  | { type: 'group'; mode?: number; children: PaintNode[] }
  | { type: 'transform'; matrix: number[]; children: PaintNode[] }
  | { type: 'clip-glyph'; glyph: number; children: PaintNode[] }
  | { type: 'clip-rect'; rect: Rect; children: PaintNode[] };
type PaintNode = Container | { type: 'color'; fill: string; opacity: number };
type Painter = (glyph: number, palette: number, foreground: Color) => { root: Container; usedForeground: boolean };

const fontsDirectory = new URL('../../fonts/', import.meta.url);
const outputDirectory = new URL('../public/fallbacks/', import.meta.url);
const specimens: Record<string, Specimen> = JSON.parse(
  await readFile(new URL('../app/specimens.json', import.meta.url), 'utf8'));

const round = (value: number) => Math.round(value * 100) / 100;
const hex = ({ red, green, blue }: Color) =>
  `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
const parseColor = (value: string): Color => {
  const [red, green, blue] = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
  return { red, green, blue, alpha: 255 };
};

function colrVersion(bytes: Uint8Array): number | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < view.getUint16(4); i++) {
    const entry = 12 + 16 * i;
    if (String.fromCharCode(...bytes.subarray(entry, entry + 4)) === 'COLR') {
      return view.getUint16(view.getUint32(entry + 8));
    }
  }
}

function shapeLine(font: Font, text: string) {
  const buffer = new ShapeBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  shape(font, buffer);
  return buffer.getGlyphInfosAndPositions();
}

function glyphRect(font: Font, glyph: number): Rect {
  const extents = font.glyphExtents(glyph);
  if (!extents) return [0, 0, 0, 0];
  const { xBearing, yBearing, width, height } = extents;
  return [xBearing, yBearing + height, xBearing + width, yBearing];
}

const contains = (outer: Rect, inner: Rect) =>
  outer[0] <= inner[0] && outer[1] <= inner[1] && outer[2] >= inner[2] && outer[3] >= inner[3];
const intersect = (a: Rect | undefined, b: Rect): Rect =>
  a ? [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])] : b;
const isIdentity = (matrix: number[]) => matrix.join() === '1,0,0,1,0,0';

// The area a subtree can paint, or undefined when no glyph outline bounds it.
function paintedArea(node: PaintNode, font: Font): Rect | undefined {
  switch (node.type) {
    case 'color':
      return undefined;
    case 'clip-glyph':
      return glyphRect(font, node.glyph);
    case 'clip-rect':
      return node.rect;
    case 'transform':
    case 'group': {
      if (node.type === 'transform' && !isIdentity(node.matrix)) return undefined;
      let area: Rect = [Infinity, Infinity, -Infinity, -Infinity];
      for (const child of node.children) {
        const childArea = paintedArea(child, font);
        if (!childArea) return undefined;
        area = [Math.min(area[0], childArea[0]), Math.min(area[1], childArea[1]),
          Math.max(area[2], childArea[2]), Math.max(area[3], childArea[3])];
      }
      return area;
    }
  }
}

// Records HarfBuzz's paint callbacks for one glyph as a tree.
function createPainter(font: Font): Painter {
  let stack: Container[] = [];
  let usedForeground = false;
  let unsupported: string | undefined;
  const top = () => stack[stack.length - 1];
  const open = (node: Container) => {
    top().children.push(node);
    stack.push(node);
  };
  const close = () => {
    stack.pop();
  };
  const reject = (feature: string) => () => {
    unsupported ??= feature;
  };

  const paints = new PaintFuncs();
  paints.setPushTransformFunc((xx, yx, xy, yy, dx, dy) =>
    open({ type: 'transform', matrix: [xx, yx, xy, yy, dx, dy], children: [] }));
  paints.setPopTransformFunc(close);
  paints.setPushClipGlyphFunc(glyph => open({ type: 'clip-glyph', glyph, children: [] }));
  paints.setPushClipRectangleFunc((xMin, yMin, xMax, yMax) =>
    open({ type: 'clip-rect', rect: [xMin, yMin, xMax, yMax], children: [] }));
  paints.setPopClipFunc(close);
  paints.setColorFunc((isForeground, color) => {
    usedForeground ||= isForeground;
    top().children.push({ type: 'color', fill: hex(color), opacity: color.alpha / 255 });
  });
  paints.setPushGroupFunc(() => open({ type: 'group', children: [] }));
  paints.setPopGroupFunc(mode => {
    const group = stack.pop();
    if (group?.type === 'group') group.mode = mode;
  });
  paints.setLinearGradientFunc(reject('linear gradients'));
  paints.setRadialGradientFunc(reject('radial gradients'));
  paints.setSweepGradientFunc(reject('sweep gradients'));
  paints.setImageFunc(() => {
    unsupported ??= 'bitmap images';
    return false;
  });

  return (glyph, palette, foreground) => {
    const root: Container = { type: 'group', children: [] };
    stack = [root];
    usedForeground = false;
    unsupported = undefined;
    font.paintGlyph(glyph, paints, undefined, palette, foreground);
    if (unsupported) {
      throw new Error(`${font.glyphName(glyph)} uses ${unsupported}, which render-fallbacks.mts does not draw yet.`);
    }
    return { root, usedForeground };
  };
}

const fill = ({ fill, opacity }: { fill: string; opacity: number }) =>
  ` fill="${fill}"${opacity < 1 ? ` fill-opacity="${round(opacity)}"` : ''}`;

// Converts a paint tree to SVG in font units, y up. `bounds` is the area the
// enclosing clips leave visible, which sizes the rectangle behind a solid color.
function toSvg(node: PaintNode, font: Font, clips: Map<string, string>, bounds?: Rect): string {
  const inner = (container: Container, area = bounds) =>
    container.children.map(child => toSvg(child, font, clips, area)).join('');
  switch (node.type) {
    case 'color': {
      const [xMin, yMin, xMax, yMax] = bounds ?? [-32768, -32768, 32768, 32768];
      return `<rect x="${round(xMin - 1)}" y="${round(yMin - 1)}" width="${round(xMax - xMin + 2)}" height="${round(yMax - yMin + 2)}"${fill(node)}/>`;
    }
    case 'clip-glyph': {
      const path = font.glyphToPath(node.glyph);
      if (!path) return '';
      const [only] = node.children;
      if (node.children.length === 1 && only.type === 'color') return `<path d="${path}"${fill(only)}/>`;
      const id = `c${node.glyph}`;
      clips.set(id, `<clipPath id="${id}"><path d="${path}"/></clipPath>`);
      return `<g clip-path="url(#${id})">${inner(node, intersect(bounds, glyphRect(font, node.glyph)))}</g>`;
    }
    case 'clip-rect': {
      // A COLR ClipBox usually only bounds the glyph clip inside it.
      const painted = paintedArea({ type: 'group', children: node.children }, font);
      if (painted && contains(node.rect, painted)) return inner(node);
      const id = `r${clips.size}`;
      const [xMin, yMin, xMax, yMax] = node.rect;
      clips.set(id, `<clipPath id="${id}"><rect x="${round(xMin)}" y="${round(yMin)}" width="${round(xMax - xMin)}" height="${round(yMax - yMin)}"/></clipPath>`);
      return `<g clip-path="url(#${id})">${inner(node, intersect(bounds, node.rect))}</g>`;
    }
    case 'transform':
      if (isIdentity(node.matrix)) return inner(node);
      return `<g transform="matrix(${node.matrix.map(round).join(' ')})">${inner(node, undefined)}</g>`;
    case 'group':
      // Painting in document order is SRC_OVER. Other modes would need SVG blending.
      if (node.mode !== undefined && node.mode !== PaintCompositeMode.SRC_OVER) {
        throw new Error(`Composite mode ${node.mode} is not supported by render-fallbacks.mts.`);
      }
      return inner(node);
  }
}

// Lays the specimen out the way CSS does for a block with a unitless
// line-height: each line box is lineHeight em tall and the font's ascent plus
// descent is centered in it. Sizes in the returned box are in em.
function renderSpecimen(font: Font, paint: Painter, palette: number, specimen: Specimen, label: string) {
  const { upem } = font.face;
  const { ascender, descender } = font.hExtents();
  const pitch = specimen.lineHeight * upem;
  const firstBaseline = (pitch - (ascender - descender)) / 2 + ascender;
  const foreground = parseColor(specimen.color);
  const definitions = new Map<number, string>();
  const clips = new Map<string, string>();
  const textColorGlyphs = new Set<string>();
  let [inkLeft, inkTop, inkRight, inkBottom] = [0, 0, 0, 0];
  let width = 0;

  const rows = specimen.lines.map((line, row) => {
    const baseline = row * pitch + firstBaseline;
    const uses: string[] = [];
    let x = 0;
    for (const { codepoint: glyph, xAdvance = 0, xOffset = 0, yOffset = 0 } of shapeLine(font, line)) {
      if (glyph === 0) throw new Error(`${label}: the font has no glyph for part of "${line}".`);
      if (!definitions.has(glyph)) {
        const { root, usedForeground } = paint(glyph, palette, foreground);
        const body = toSvg(root, font, clips);
        if (usedForeground && body) textColorGlyphs.add(font.glyphName(glyph));
        definitions.set(glyph, body);
      }
      if (definitions.get(glyph)) {
        uses.push(`<use href="#g${glyph}" x="${round(x + xOffset)}"${yOffset ? ` y="${round(yOffset)}"` : ''}/>`);
        const [xMin, yMin, xMax, yMax] = glyphRect(font, glyph);
        inkLeft = Math.min(inkLeft, x + xOffset + xMin);
        inkRight = Math.max(inkRight, x + xOffset + xMax);
        inkTop = Math.min(inkTop, baseline - yOffset - yMax);
        inkBottom = Math.max(inkBottom, baseline - yOffset - yMin);
      }
      x += xAdvance;
    }
    width = Math.max(width, x);
    return `<g transform="matrix(1 0 0 -1 0 ${round(baseline)})">${uses.join('')}</g>`;
  });

  // The SVG covers the text box plus any ink that reaches outside it.
  const height = specimen.lines.length * pitch;
  const [left, top] = [Math.min(0, inkLeft), Math.min(0, inkTop)];
  const [right, bottom] = [Math.max(width, inkRight), Math.max(height, inkBottom)];
  const glyphs = [...definitions].filter(([, body]) => body).map(([glyph, body]) => `<g id="g${glyph}">${body}</g>`);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(left)} ${round(top)} ${round(right - left)} ${round(bottom - top)}">`,
    `<!-- ${label}, drawn by site/scripts/render-fallbacks.mts. Glyph outlines derive from Fira Code under the SIL OFL 1.1. -->`,
    `<defs>${[...clips.values()].join('')}${glyphs.join('')}</defs>`,
    ...rows,
    '</svg>',
    '',
  ].join('\n');
  const em = (units: number) => Math.round(units / upem * 10000) / 10000;
  return {
    svg,
    textColorGlyphs,
    box: {
      width: em(right - left),
      height: em(bottom - top),
      top: em(top),
      right: em(width - right),
      bottom: em(height - bottom),
      left: em(left),
    },
  };
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const manifest = {
  fonts: {} as Record<string, { colr: number | null; palettes: number }>,
  fallbacks: {} as Record<string, ReturnType<typeof renderSpecimen>['box']>,
};
let bytesWritten = 0;
const files = (await readdir(fontsDirectory)).filter(file => /^PrismCode-[A-Za-z]+\.ttf$/.test(file)).sort();

for (const file of files) {
  const name = file.slice('PrismCode-'.length, -'.ttf'.length);
  const bytes = await readFile(new URL(file, fontsDirectory));
  const font = new Font(new Face(new Blob(bytes)));
  const colr = colrVersion(bytes) ?? null;
  const palettes = font.face.getColorPalettes().length;
  manifest.fonts[name] = { colr, palettes };
  if (colr !== 1) continue;

  const paint = createPainter(font);
  const textColorGlyphs = new Set<string>();
  for (const [specimenName, specimen] of Object.entries(specimens)) {
    if (specimen.fonts && !specimen.fonts.includes(name)) continue;
    for (let palette = 0; palette < palettes; palette++) {
      const key = `${name}-${palette}-${specimenName}`;
      const result = renderSpecimen(font, paint, palette, specimen, `${file}, palette ${palette}, ${specimenName}`);
      await writeFile(new URL(`${key}.svg`, outputDirectory), result.svg);
      bytesWritten += Buffer.byteLength(result.svg);
      manifest.fallbacks[key] = result.box;
      for (const glyph of result.textColorGlyphs) textColorGlyphs.add(glyph);
    }
  }
  if (textColorGlyphs.size) console.log(`${name}: ${[...textColorGlyphs].join(' ')} use the text color.`);
}

for (const [specimenName, { fonts = [] }] of Object.entries(specimens)) {
  for (const name of fonts) {
    if (manifest.fonts[name]?.colr !== 1) {
      throw new Error(`app/specimens.json: ${specimenName} lists ${name}, which is not a COLRv1 font in fonts/.`);
    }
  }
}

await writeFile(new URL('manifest.json', outputDirectory), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Rendered ${Object.keys(manifest.fallbacks).length} SVG fallbacks (${Math.round(bytesWritten / 1024)} kB).`);
