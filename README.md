# Femur

[![Deploy to GitHub Pages](https://github.com/dtellz/femur/actions/workflows/deploy.yml/badge.svg)](https://github.com/dtellz/femur/actions/workflows/deploy.yml)

An MMO game prototype built with 3D Gaussian Splatting for world rendering.

## Stack

- **[SparkJS](https://sparkjs.dev/)** - 3D Gaussian Splatting renderer for Three.js (by World Labs)
- **[Three.js](https://threejs.org/)** - 3D engine
- **[Vite](https://vite.dev/)** - Build tool

## Features

- Gaussian splat world rendering via SparkJS `SplatMesh`
- Third-person character controller with physics
- Earth-like gravity, jumping, and ground detection via splat raycasting
- WASD movement relative to camera direction
- Sprint, zoom, and pointer-lock mouse look

## Controls

| Input | Action |
|-------|--------|
| Click | Capture mouse |
| WASD | Move |
| Mouse | Look around |
| Shift | Sprint |
| Space | Jump |
| Scroll | Zoom in/out |
| Esc | Release mouse |

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Deployment

Pushes to `master` or `main` automatically deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.
