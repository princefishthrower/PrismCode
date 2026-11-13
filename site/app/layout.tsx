import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { repository } from '../paths';
import { fontStyles } from './theme-data';
import { Year } from './year';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'PrismCode', template: '%s · PrismCode' },
  description: 'An open-source collection of multicolored programming fonts based on Fira Code.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><style>{fontStyles}</style></head>
      <body>
        <header className="site-header">
          <nav className="shell flex items-center justify-center gap-5" aria-label="Main navigation">
            <Link href="/themes/">Themes</Link>
            <a href={repository}>GitHub ↗</a>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div className="shell flex flex-wrap justify-between gap-x-6 gap-y-2">
            <small>
              © <Year initial={new Date().getFullYear()} />{' '}
              <a className="company-link" href="https://fullstackcraft.com/">Full Stack Craft LLC</a>
            </small>
            <a href={repository}>GitHub ↗</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
