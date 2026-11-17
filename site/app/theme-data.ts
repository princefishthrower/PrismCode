import { basePath } from '../paths';

export const themes = [
  { name: 'Sunset', file: 'Regular', category: 'strokes', description: 'Rose, orange, and yellow color separate strokes in the original PrismCode palette.' },
  { name: 'Aurora', file: 'Regular', palette: 1, category: 'strokes', description: 'Purple, mint, and sky blue replace Sunset\'s three stroke colors.' },
  { name: 'Neon', file: 'Regular', palette: 2, category: 'strokes', description: 'Pink, lime, and cyan bring high-energy color to the same stroke shapes.' },
  { name: 'Ice', file: 'Regular', palette: 3, category: 'strokes', description: 'Pale blue, sky blue, and cyan color the same individual strokes as Sunset.' },
  { name: 'True Shuffle', file: 'TrueShuffle', category: 'strokes', description: 'Each stroke gets an independent, seeded color.' },
  { name: 'Shuffle Hue Rotation', file: 'ShuffleHueRotation', category: 'strokes', description: 'Each glyph starts with a seeded color. Successive strokes rotate the hue by 45°.' },
  { name: 'Shades', file: 'Shades', category: 'strokes', description: 'Each glyph uses a single hue with strokes that range from dark to light.' },
  { name: 'Spectrum', file: 'Spectrum', category: 'characters', description: 'A 26-color rainbow follows the alphabet. Uppercase and lowercase share colors.' },
  { name: 'Spectrum Mirror', file: 'SpectrumMirror', category: 'characters', description: 'Uppercase follows the rainbow from A to Z. Lowercase follows it in reverse.' },
  { name: 'Dvorak', file: 'Dvorak', category: 'characters', description: 'Colors follow the US Dvorak layout, with distinct colors on neighboring keys.' },
  { name: 'Qwerty', file: 'Qwerty', category: 'characters', description: 'Colors follow the physical positions of keys on a US QWERTY keyboard.' },
] as const;

export const fontUrl = (file: string, extension: 'woff2' | 'ttf') =>
  `${basePath}/fonts/PrismCode-${file}.${extension}`;

export const fontFamily = (file: string) => `PrismCode-${file}`;

export const fontStyles = [
  ...[...new Set(themes.map(({ file }) => file))].map(file =>
    `@font-face { font-family: "${fontFamily(file)}"; src: url("${fontUrl(file, 'woff2')}") format("woff2"); font-display: swap; }`),
  ...themes.flatMap(theme => 'palette' in theme
    ? [`@font-palette-values --${theme.name.toLowerCase()} { font-family: "${fontFamily(theme.file)}"; base-palette: ${theme.palette}; }`]
    : []),
].join('\n');
