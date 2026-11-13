// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

type Point = readonly [number, number];
type ColorIndex = 0 | 1 | 2;
export type Mask = { color: ColorIndex; points: readonly Point[] };
export type Strokes = { base: ColorIndex; masks: readonly Mask[] };

const minX = -3555;
const maxX = 2384;
const minY = -1000;
const maxY = 2400;

const polygon = (color: ColorIndex, ...points: Point[]): Mask => ({ color, points });
const box = (color: ColorIndex, left: number, bottom: number, right: number, top: number) =>
  polygon(color, [left, bottom], [right, bottom], [right, top], [left, top]);
const right = (x: number, color: ColorIndex = 1) => box(color, x, minY, maxX, maxY);
const above = (y: number, color: ColorIndex = 1) => box(color, minX, y, maxX, maxY);
const below = (y: number, color: ColorIndex = 2) => box(color, minX, minY, maxX, y);
const stroke = (base: ColorIndex, ...masks: Mask[]): Strokes => ({ base, masks });

const bar = stroke(0, below(620, 1));
const dot = stroke(0, below(350, 2));
const brace = stroke(2, above(875, 0), below(525, 1));

// Coordinates follow the joins and components of the pinned Fira Code outlines.
export const ascii: Record<string, Strokes> = {
  A: stroke(0, right(600), polygon(2, [322, 351], [867, 351], [822, 495], [367, 495])),
  B: stroke(0, box(1, 366, 729, maxX, maxY), box(2, 366, minY, maxX, 729)),
  C: stroke(0, box(1, 680, 760, maxX, maxY), box(2, 680, minY, maxX, 300)),
  D: stroke(0, right(366)),
  E: stroke(0, right(425), box(2, 425, 628, maxX, 771)),
  F: stroke(0, right(425), box(2, 425, 595, maxX, 810)),
  G: stroke(0, box(1, 655, 470, maxX, 790), box(2, 845, minY, maxX, 600)),
  H: stroke(0, right(860), box(2, 340, 653, 860, 795)),
  I: stroke(0, above(1230), below(147)),
  J: stroke(0, above(1230), below(300)),
  K: stroke(0, right(365), box(2, 365, minY, maxX, 700)),
  L: stroke(0, below(146, 2)),
  M: stroke(2, polygon(0, [0, -100], [280, -100], [263, 1218], [252, 1500], [0, 1500]),
    polygon(1, [918, 1218], [929, -100], [1200, -100], [1200, 1500], [930, 1500])),
  N: stroke(2, polygon(0, [0, -100], [330, -100], [330, 1220], [240, 1500], [0, 1500]),
    polygon(1, [870, 1500], [1200, 1500], [1200, -100], [970, -100], [870, 150])),
  O: stroke(0, right(600)),
  P: stroke(0, right(385)),
  Q: stroke(0, right(600), box(2, 600, minY, maxX, 95)),
  R: stroke(0, box(1, 380, 600, maxX, maxY), box(2, 510, minY, maxX, 600)),
  S: stroke(0, above(850, 1), below(460)),
  T: stroke(0, above(1230, 2)),
  U: stroke(2, box(0, minX, 425, 600, maxY), box(1, 600, 425, maxX, maxY)),
  V: stroke(0, right(600)),
  W: stroke(2, box(0, minX, minY, 420, maxY), right(780)),
  X: stroke(0, polygon(1, [880, 1490], [1180, 1490], [310, -100], [10, -100])),
  Y: stroke(2, box(0, minX, 525, 600, maxY), box(1, 600, 525, maxX, maxY)),
  Z: stroke(0, above(1230), below(147)),

  a: stroke(0, box(1, 190, 755, maxX, maxY), box(2, 807, minY, maxX, 639)),
  b: stroke(0, right(369)),
  c: stroke(0, box(1, 677, 690, maxX, maxY), box(2, 677, minY, maxX, 330)),
  d: stroke(0, right(831)),
  e: stroke(0, box(2, 333, 467, maxX, 597)),
  f: stroke(0, box(2, minX, 839, maxX, 971)),
  g: stroke(0, below(353, 1), box(2, 800, 976, maxX, maxY)),
  h: stroke(0, right(369)),
  i: stroke(0, above(1200, 2), below(133, 1)),
  j: stroke(0, above(1200, 2), below(100, 1)),
  k: stroke(0, right(379), box(2, 379, minY, maxX, 580)),
  l: stroke(0, below(285, 1)),
  m: stroke(0, right(663, 2), box(1, 243, minY, 663, maxY)),
  n: stroke(0, right(369)),
  o: stroke(0, right(600)),
  p: stroke(0, right(369)),
  q: stroke(0, right(831)),
  r: stroke(0, right(543), below(129, 2)),
  s: stroke(0, above(735), below(370)),
  t: stroke(0, box(2, minX, 923, maxX, 1053), below(270, 1)),
  u: stroke(0, right(831)),
  v: stroke(0, right(600)),
  w: stroke(2, box(0, minX, minY, 400, maxY), right(800)),
  x: stroke(0, polygon(1, [840, 1150], [1130, 1150], [350, -100], [60, -100])),
  y: stroke(0, box(1, 580, 380, maxX, maxY), below(0)),
  z: stroke(0, above(920), below(133)),

  '0': stroke(0, polygon(2, [361, 324], [781, 1175], [839, 1050], [420, 200])),
  '1': stroke(0, above(1120), below(143)),
  '2': stroke(0, above(1035), below(148)),
  '3': stroke(0, above(735, 1)),
  '4': stroke(0, right(765), below(336, 2)),
  '5': stroke(0, above(1230, 2), below(725, 1)),
  '6': stroke(0, above(900, 1)),
  '7': stroke(0, above(1230, 2)),
  '8': stroke(0, above(730, 1)),
  '9': stroke(0, below(440, 1)),

  '!': dot, '"': stroke(0, right(600)), '#': stroke(0, box(2, minX, 426, maxX, 561),
    box(1, minX, 887, maxX, 1022)),
  '$': stroke(0, above(1377), below(0)), '%': stroke(0,
    box(1, minX, 760, 485, maxY), box(2, 715, minY, maxX, 575)),
  '&': stroke(0, above(780), box(2, 860, minY, maxX, 800)),
  "'": stroke(2), '(': brace, ')': brace, '*': stroke(2),
  '+': stroke(0, box(2, minX, 551, maxX, 692)), ',': stroke(1),
  '-': stroke(1), '.': stroke(2), '/': stroke(1), ':': bar, ';': dot,
  '<': stroke(0, below(626, 1)), '=': bar, '>': stroke(0, below(626, 1)),
  '?': dot, '@': stroke(0, box(1, 480, 340, 985, 1050)),
  '[': stroke(0, above(1480, 1), below(-120)), '\\': stroke(1),
  ']': stroke(0, above(1480, 1), below(-120)), '^': stroke(0, right(600)),
  '_': stroke(2), '`': stroke(2), '{': brace, '|': stroke(1), '}': brace,
  '~': stroke(0, right(600)),
};

export const ligatures: Record<string, Record<string, Strokes>> = {
  '=>': {
    'equal_start.seq': bar,
    'greater_equal_end.seq': stroke(0, box(1, minX, minY, 260, 620), right(270, 2)),
  },
  '->': { 'hyphen_start.seq': stroke(1), 'greater_hyphen_end.seq': stroke(1, right(420, 2)) },
  '<-': {
    'less_hyphen_start.seq': stroke(1, box(2, minX, minY, 780, maxY)),
    'hyphen_end.seq': stroke(1),
  },
  '==': { 'equal_equal.liga': bar },
  '===': { 'equal_equal_equal.liga': stroke(0, above(810, 2), below(435, 1)) },
  '!=': { 'exclam_equal.liga': stroke(0,
    polygon(2, [-660, -180], [-380, -220], [620, 1450], [340, 1490])) },
  '!==': { 'exclam_equal_equal.liga': stroke(0,
    polygon(2, [-1260, -180], [-980, -220], [20, 1450], [-260, 1490])) },
  '<=': { 'less_equal.liga': stroke(0, below(445, 2)) },
  '>=': { 'greater_equal.liga': stroke(0, below(445, 2)) },
  '&&': { 'ampersand_ampersand.liga': stroke(0, right(0)) },
  '||': { 'bar_bar.liga': stroke(0, right(0)) },
  '??': { 'question_question.liga': stroke(0, right(0), below(350)) },
  '...': { 'period_period_period.liga': stroke(0, right(-900, 1), right(-300, 2)) },
  '::': { 'colon_colon.liga': stroke(0, right(0), below(450)) },
  '++': { 'plus_plus.liga': stroke(0, box(2, minX, 551, maxX, 692), right(0)) },
  '--': { 'hyphen_hyphen.liga': stroke(0, right(0)) },
  '//': { 'slash_slash.liga': stroke(0, right(0)) },
  '/*': { 'slash_asterisk.liga': stroke(0, right(60, 2)) },
  '*/': { 'asterisk_slash.liga': stroke(2, right(60, 0)) },
  '**': { 'asterisk_asterisk.liga': stroke(0, right(0, 2)) },
};

export function maskPath(mask: Pick<Mask, 'points'>): string {
  return `M${mask.points.map(point => point.join(',')).join('L')}Z`;
}
