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

## Adding Characters

Characters are GLTF/GLB models loaded with Three.js's `GLTFLoader`. Any model with skeletal animations works.

### Adding an NPC

1. Define a model preset in `src/npc.js` (or inline):

```js
const MY_MODEL = {
  url: "https://example.com/my-model.glb", // or "/models/my-model.glb" for local files
  scale: 0.5,
  rotationY: Math.PI, // face forward
  idleClip: "Idle",   // name of the idle animation clip
  walkClip: "Walk",   // name of the walk animation clip
  runClip: "Run",     // name of the run animation clip (optional)
};
```

2. Spawn it in `src/main.js`:

```js
spawnNPCs(scene, PLAYER_SPAWN, [
  { preset: MY_MODEL, offset: new THREE.Vector3(5, 0, 0), wanderRadius: 4 },
]);
```

### Replacing the player model

Edit `MODEL_URL` in `src/character.js` and update the clip names (`Idle`, `Walk`, `Run`) to match your model's animation names. You can inspect animation names by logging `gltf.animations.map(c => c.name)` after loading.

### Using local model files

Drop `.glb` files into `public/models/` and reference them as `/models/my-model.glb`.

### Where to find 3D character models

| Source | Notes |
|--------|-------|
| [Mixamo](https://www.mixamo.com/) | Free rigged + animated characters from Adobe. Export as FBX, convert to GLB with [gltf-transform](https://gltf-transform.dev/) or Blender |
| [Ready Player Me](https://readyplayer.me/) | Free avatar creator, exports GLB. Add animations via Mixamo |
| [Sketchfab](https://sketchfab.com/search?type=models&features=downloadable&sort_by=-likeCount) | Huge library, filter by "downloadable" and "animated" |
| [Quaternius](https://quaternius.com/) | Free low-poly animated characters, CC0 license |
| [Kenney](https://kenney.nl/assets/category:3D) | Free game-ready assets, CC0 license |
| [Poly Pizza](https://poly.pizza/) | Free low-poly models, many animated |
| [Three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf) | Soldier, RobotExpressive, etc. Already GLB format |
| [Turbosquid](https://www.turbosquid.com/) | Large marketplace, has free section |
| [CGTrader](https://www.cgtrader.com/) | Marketplace with free and paid models |

> **Tip**: When downloading from Mixamo, choose "FBX Binary" then convert to GLB using Blender (File > Export > glTF 2.0) for best web performance.

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
