# PrismCode showcase

From this directory, run:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/PrismCode/`. With Node 24, `npm run build`
writes the static site to `out/`. GitHub Actions publishes that directory
on pushes to `main`, with GitHub Pages set to GitHub Actions.

The build copies the repository's generated fonts and OFL license.
For a new theme, add the generated TTF and WOFF2 to the root `fonts/`
directory and add a record to `app/theme-data.ts`.

The button and card treatments adapt the styles of
[Neobrutalism Components](https://www.neobrutalism.dev/).
