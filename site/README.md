# PrismCode website

From this directory, run:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/PrismCode/`. With Node 24, `npm run build`
writes the static site to `out/`. GitHub Actions publishes that directory
on pushes to `main`, with GitHub Pages set to GitHub Actions. The workflow
first rebuilds the fonts from source and stops if they differ from the
committed ones.

The build copies the repository's generated fonts and OFL license.
It then runs `scripts/render-fallbacks.mts`, which draws each COLRv1
specimen in `app/specimens.json` to an SVG in `public/fallbacks/`.
Browsers without COLRv1, such as Safari, show those SVGs under the
live text, which stays selectable in transparent ink. Restart
`npm run dev` after editing `app/specimens.json`.
For a new theme, add it to the generator in the root `src/`, run
`npm run build` in the repository root, commit the new files in `fonts/`
and `previews/`, and add a record to `app/theme-data.ts`.

The button and card treatments adapt the styles of
[Neobrutalism Components](https://www.neobrutalism.dev/).
