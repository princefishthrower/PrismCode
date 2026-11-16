import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { repository } from '../../paths';
import { ColorText } from '../color-text';
import { fontFamily, fontUrl, themes } from '../theme-data';

export const metadata: Metadata = { title: 'Themes' };

const groups = [
  { category: 'strokes', heading: 'Multicolored strokes' },
  { category: 'characters', heading: 'Character-based coloring' },
] as const;

export default function ThemeGallery() {
  return (
    <main className="gallery shell">
      <h1>Pick a palette.</h1>
      {groups.map(({ category, heading }) => (
        <section key={category} aria-labelledby={category} className="theme-group">
          <h2 id={category}>{heading}</h2>
          <div className="theme-grid">
            {themes.filter(theme => theme.category === category).map(theme => {
              const palette = 'palette' in theme ? theme.palette : 0;
              const style: CSSProperties = {
                fontFamily: `"${fontFamily(theme.file)}", monospace`,
                fontPalette: 'palette' in theme ? `--${theme.name.toLowerCase()}` : undefined,
              };
              return (
                <article className="theme-card" data-slot="card" key={theme.name}>
                  <h3>{theme.name}</h3>
                  <div className="font-specimen card-specimen" style={style}>
                    <ColorText as="p" file={theme.file} palette={palette} name="card-title" className="specimen-title" />
                    <ColorText as="pre" file={theme.file} palette={palette} name="card-code" code />
                    <ColorText as="p" file={theme.file} palette={palette} name="card-ligatures" code className="ligatures" />
                  </div>
                  <p className="theme-description">{theme.description}</p>
                  <div className="downloads flex flex-wrap gap-4">
                    <a href={fontUrl(theme.file, 'woff2')} download aria-label={`Download ${theme.name} WOFF2`}>WOFF2 ↓</a>
                    <a href={fontUrl(theme.file, 'ttf')} download aria-label={`Download ${theme.name} TTF`}>TTF ↓</a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <section className="contribute">
        <h2>Have an idea for a new theme?</h2>
        <p>PrismCode is open source! Submit a pull request!</p>
        <a href={`${repository}/compare`}>Submit a PR ↗</a>
      </section>
    </main>
  );
}
