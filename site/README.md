# PrismCode website

From this directory, run:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/PrismCode/`. With Node 24, `npm run build`
writes the static site to `out/`. GitHub Actions publishes that directory
on pushes to `main`, with GitHub Pages set to GitHub Actions.

The build copies the repository's generated fonts and OFL license.
It then runs `scripts/render-fallbacks.mts`, which draws each COLRv1
specimen in `app/specimens.json` to an SVG in `public/fallbacks/`.
Browsers without COLRv1, such as Safari, show those SVGs under the
live text, which stays selectable in transparent ink. Restart
`npm run dev` after editing `app/specimens.json`.
For a new theme, add the generated TTF and WOFF2 to the root `fonts/`
directory and add a record to `app/theme-data.ts`.

The button and card treatments adapt the styles of
[Neobrutalism Components](https://www.neobrutalism.dev/).
