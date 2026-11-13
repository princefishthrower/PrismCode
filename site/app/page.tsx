import Link from 'next/link';
import { repository } from '../paths';
import { ColorText } from './color-text';
import { fontFamily } from './theme-data';

const heroFont = 'TrueShuffle';

export default function Home() {
  return (
    <main className="hero">
      <div className="shell hero-content">
        <div className="hero-specimen font-specimen" style={{ fontFamily: `"${fontFamily(heroFont)}", monospace` }}>
          <ColorText as="h1" file={heroFont} name="hero-title" />
          <ColorText as="pre" file={heroFont} name="hero-code" code className="hero-code" label="FizzBuzz code example" />
        </div>
        <p className="hero-tagline">Code in full color.</p>
        <p className="hero-description">An open-source collection of multicolored programming fonts based on Fira Code.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a className="neo-button" href={`${repository}/releases/latest`}>Get the Font <span aria-hidden="true">↗</span></a>
          <Link className="neo-button neutral" href="/themes/">Browse Themes <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
