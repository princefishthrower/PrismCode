// Copyright (c) 2026 Full Stack Craft LLC
// SPDX-License-Identifier: MIT

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const rainbow = [
  '#FF6678', '#FF6E6B', '#FF785F', '#FF8654', '#FF984D', '#FFAE48',
  '#FFC348', '#FAD747', '#EAE84B', '#CDEB53', '#A9E85B', '#84E46D',
  '#61DF89', '#4DD9A6', '#45D6C2', '#42D2DA', '#48C6EE', '#59B7FF',
  '#73A5FF', '#8E98FF', '#A68BFF', '#BC82FF', '#D47CFA', '#E779ED',
  '#F678D8', '#FF76BC',
];

export const keyboardLayouts = {
  dvorak: [
    ['`1234567890[]', '~!@#$%^&*(){}'],
    ["',.pyfgcrl/=\\", '"<>PYFGCRL?+|'],
    ['aoeuidhtns-', 'AOEUIDHTNS_'],
    [';qjkxbmwvz', ':QJKXBMWVZ'],
  ],
  qwerty: [
    ['`1234567890-=', '~!@#$%^&*()_+'],
    ['qwertyuiop[]\\', 'QWERTYUIOP{}|'],
    ["asdfghjkl;'", 'ASDFGHJKL:"'],
    ['zxcvbnm,./', 'ZXCVBNM<>?'],
  ],
} as const;

const keyboardColors = [
  ['#FF7777', '#54E2DF', '#B2E765', '#BD9AFF'],
  ['#77E792', '#F78DDC', '#FFD06B', '#8CA9FF'],
] as const;

const supplementalColors = {
  '#C1A5FF': '0123456789',
  '#F9D875': '()[]{}<>',
  '#79E6BB': '+-*/%=!&|^~',
  '#FF9CC7': '`\'"\\@#$?:;.,_',
};

// A ligature gets a fixed color by operator, including each visible piece of multi-glyph arrows.
export const ligatureColors: Record<string, string> = {
  '=>': '#6DE3F3', '->': '#6DE3F3', '<-': '#6DE3F3',
  '==': '#F9D875', '===': '#F9D875', '!=': '#FF8E9D', '!==': '#FF8E9D',
  '<=': '#F9D875', '>=': '#F9D875',
  '&&': '#91E6A0', '||': '#91E6A0', '??': '#91E6A0',
  '...': '#D3ADFF', '::': '#D3ADFF', '++': '#D3ADFF', '--': '#D3ADFF',
  '//': '#A7BBD3', '/*': '#A7BBD3', '*/': '#A7BBD3', '**': '#D3ADFF',
  '/>': '#F9D875',
  '~>': '#6DE3F3', '<~': '#6DE3F3', '>-': '#6DE3F3', '-<': '#6DE3F3',
  '|>': '#6DE3F3', '<|': '#6DE3F3', '>>': '#6DE3F3', '<<': '#6DE3F3',
  '^=': '#F9D875', '=|': '#F9D875', ':=': '#F9D875', '/=': '#F9D875',
  '#=': '#F9D875', '?=': '#F9D875', '</': '#F9D875', '<>': '#F9D875',
  '~~': '#D3ADFF', '~-': '#D3ADFF', '-~': '#D3ADFF', '-|': '#D3ADFF',
  '|-': '#D3ADFF', '..': '#D3ADFF', ';;': '#D3ADFF', '__': '#D3ADFF',
  '%%': '#D3ADFF',
  '|}': '#A7BBD3', '|]': '#A7BBD3', '{|': '#A7BBD3', '[|': '#A7BBD3',
  ']#': '#A7BBD3', '#{': '#A7BBD3', '#[': '#A7BBD3', '#(': '#A7BBD3',
  '##': '#A7BBD3', '#_': '#A7BBD3', '\\/': '#A7BBD3', '/\\': '#A7BBD3',
  '!!': '#FF8E9D', '#!': '#FF8E9D', '#?': '#FF8E9D', '?.': '#FF8E9D',
  '.?': '#FF8E9D',
  '~@': '#91E6A0', '*>': '#91E6A0', '$>': '#91E6A0', '<*': '#91E6A0',
  '<$': '#91E6A0', '<+': '#91E6A0', '#:': '#91E6A0', '+>': '#91E6A0',
};

function spectrum(mirror: boolean): Map<string, string> {
  const colors = new Map<string, string>();
  [...alphabet].forEach((letter, index) => {
    colors.set(letter, rainbow[index]);
    colors.set(letter.toLowerCase(), rainbow[mirror ? 25 - index : index]);
  });
  for (const [color, characters] of Object.entries(supplementalColors)) {
    for (const character of characters) colors.set(character, color);
  }
  return colors;
}

function keyboard(rows: typeof keyboardLayouts[keyof typeof keyboardLayouts]): Map<string, string> {
  const colors = new Map<string, string>();
  // Neighboring rows use disjoint colors, with repeats every four physical keys.
  rows.forEach(([normal, shifted], row) => {
    [...normal].forEach((character, column) => {
      const color = keyboardColors[row % 2][column % 4];
      colors.set(character, color);
      colors.set(shifted[column], color);
    });
  });
  return colors;
}

export const variants = [
  { file: 'Spectrum', slug: 'spectrum', name: 'Spectrum', characters: spectrum(false) },
  { file: 'SpectrumMirror', slug: 'spectrum-mirror', name: 'Spectrum Mirror', characters: spectrum(true) },
  { file: 'Dvorak', slug: 'dvorak', name: 'Dvorak', characters: keyboard(keyboardLayouts.dvorak) },
  { file: 'Qwerty', slug: 'qwerty', name: 'Qwerty', characters: keyboard(keyboardLayouts.qwerty) },
];
