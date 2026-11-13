import Link from 'next/link';
import { repository } from '../paths';
import { fontFamily } from './theme-data';

const fizzBuzz = `for (let n = 1; n <= 100; n++) {
  const fizz = n % 3 === 0;
  const buzz = n % 5 === 0;
  console.log(
    fizz && buzz ? 'FizzBuzz' :
    fizz ? 'Fizz' :
    buzz ? 'Buzz' : n
  );
}`;

export default function Home() {
  return (
    <main className="hero">
      <div className="shell hero-content">
        <div className="hero-specimen font-specimen" style={{ fontFamily: `"${fontFamily('TrueShuffle')}", monospace` }}>
          <h1>&lt;PrismCode&gt;</h1>
          <pre className="hero-code" aria-label="FizzBuzz code example"><code>{fizzBuzz}</code></pre>
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
