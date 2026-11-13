import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { basePath } from '../paths';
import specimens from './specimens.json';

export type SpecimenName = keyof typeof specimens;

type Box = { width: number; height: number; top: number; right: number; bottom: number; left: number };
type Manifest = {
  fonts: Record<string, { colr: number | null; palettes: number }>;
  fallbacks: Record<string, Box>;
};

let manifest: Manifest | undefined;

// scripts/render-fallbacks.mts writes the manifest before `next dev` and `next build`.
function readManifest(): Manifest {
  manifest ??= JSON.parse(readFileSync(join(process.cwd(), 'public/fallbacks/manifest.json'), 'utf8')) as Manifest;
  return manifest;
}

const em = (value: number) => `${value}em`;

type Props = {
  as: 'h1' | 'p' | 'pre';
  /** Font file name after "PrismCode-", such as "TrueShuffle". The font itself is inherited. */
  file: string;
  name: SpecimenName;
  palette?: number;
  /** Wraps the text in <code>. */
  code?: boolean;
  className?: string;
  label?: string;
};

/**
 * Renders a specimen from specimens.json. For a COLRv1 font, the matching SVG
 * from render-fallbacks.mts sits under the text, and globals.css shows it only
 * where the browser can't draw COLRv1.
 */
export function ColorText({ as: Tag, file, name, palette = 0, code = false, className, label }: Props) {
  const { lines, lineHeight } = specimens[name];
  const text = lines.join('\n');
  const { fonts, fallbacks } = readManifest();
  if (!fonts[file]) throw new Error(`No font file PrismCode-${file}.ttf in fonts/.`);
  const key = `${file}-${palette}-${name}`;
  const box = fallbacks[key];
  if (!box && fonts[file].colr === 1) {
    throw new Error(`No SVG fallback for ${key}. Add "${file}" to "${name}".fonts in app/specimens.json.`);
  }

  const Text = code ? 'code' : 'span';
  return (
    <Tag className={className} aria-label={label} style={{ lineHeight }}>
      {box ? (
        <span className="color-text">
          <img
            className="color-text-fallback"
            src={`${basePath}/fallbacks/${key}.svg`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            style={{
              width: em(box.width),
              height: em(box.height),
              // Negative margins let ink outside the line boxes overhang without moving the text.
              margin: box.top || box.right || box.bottom || box.left
                ? [box.top, box.right, box.bottom, box.left].map(em).join(' ')
                : undefined,
            }}
          />
          <Text className="color-text-live">{text}</Text>
        </span>
      ) : code ? <code>{text}</code> : text}
    </Tag>
  );
}
