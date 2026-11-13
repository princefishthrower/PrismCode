import Link from 'next/link';
import { repository } from '../paths';
import { fontFamily } from './theme-data';

export default function Home() {
  return (
    <main className="hero">
      <div className="shell hero-content">
        <div className="hero-specimen">
          <h1 className="font-specimen" style={{ fontFamily: `"${fontFamily('TrueShuffle')}", monospace` }}>
            PrismCode
          </h1>
        </div>
        <p className="hero-tagline">Code in full color.</p>
        <p className="hero-description">An open-source collection of multicolored programming fonts based on Fira Code.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a className="neo-button" href={repository}>Get the Font <span aria-hidden="true">↗</span></a>
          <Link className="neo-button neutral" href="/themes/">Browse Themes <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
