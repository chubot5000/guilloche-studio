# Rouletté Guilloché Studio

An interactive mathematical pattern studio for designing and exporting precise
guilloché artwork as SVG or high-resolution PNG.

## Constructions

- radial medallions and layered spirographs
- woven superellipse borders
- flowing ribbons and tube-like braids
- repeating fields, moiré interference, and precision wave hatching
- geodesic globes and parametric torus meshes with configurable nodes

Every construction has contextual controls, reusable starting plates, color and
stroke settings, and deterministic vector output.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm test
npm run build:vercel
```

`npm run build` produces the existing Sites/Cloudflare build. Vercel uses
`npm run build:vercel` through `vercel.json`.

## Deployment

The repository is configured for both the existing Sites deployment and a
standard Vercel Next.js deployment. No environment variables are required for
the pattern studio.
