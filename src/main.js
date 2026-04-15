import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
camera.position.set(0, 1.5, 4);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Spark renderer ---
const spark = new SparkRenderer({ renderer });
scene.add(spark);

// --- FPS controls (pointer lock + WASD) ---
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.object);

const keys = {};
const MOVE_SPEED = 3.0;
const SPRINT_MULTIPLIER = 2.0;

window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

// Click canvas to lock pointer
renderer.domElement.addEventListener("click", () => {
  if (!controls.isLocked) controls.lock();
});

// Show/hide crosshair on lock state change
controls.addEventListener("lock", () => {
  crosshair.style.display = "block";
  instructions.style.display = "none";
});
controls.addEventListener("unlock", () => {
  crosshair.style.display = "none";
  instructions.style.display = "flex";
});

function updateMovement(delta) {
  if (!controls.isLocked) return;

  const speed = MOVE_SPEED * (keys["ShiftLeft"] ? SPRINT_MULTIPLIER : 1.0) * delta;
  const direction = new THREE.Vector3();

  // Forward/back (W/S)
  if (keys["KeyW"]) direction.z -= 1;
  if (keys["KeyS"]) direction.z += 1;

  // Strafe left/right (A/D)
  if (keys["KeyA"]) direction.x -= 1;
  if (keys["KeyD"]) direction.x += 1;

  // Up/down (Space/Ctrl)
  if (keys["Space"]) direction.y += 1;
  if (keys["ControlLeft"] || keys["ControlRight"]) direction.y -= 1;

  if (direction.length() > 0) {
    direction.normalize();
    controls.moveRight(direction.x * speed);
    controls.moveForward(-direction.z * speed);
    camera.position.y += direction.y * speed;
  }
}

// --- Loading UI ---
const loadingEl = document.getElementById("loading");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");

function updateProgress(pct, msg) {
  progressFill.style.width = `${pct}%`;
  if (msg) progressText.textContent = msg;
}

// --- HUD elements ---
const crosshair = document.createElement("div");
crosshair.style.cssText =
  "position:fixed;top:50%;left:50%;width:12px;height:12px;transform:translate(-50%,-50%);" +
  "border:1.5px solid rgba(255,255,255,0.6);border-radius:50%;pointer-events:none;display:none;z-index:5;";
document.body.appendChild(crosshair);

const instructions = document.createElement("div");
instructions.style.cssText =
  "position:fixed;bottom:2rem;left:0;right:0;display:flex;justify-content:center;" +
  "pointer-events:none;z-index:5;";
instructions.innerHTML =
  '<div style="background:rgba(0,0,0,0.7);color:#aaa;padding:0.5rem 1.2rem;border-radius:6px;' +
  'font-family:system-ui,sans-serif;font-size:0.8rem;letter-spacing:0.03em;">' +
  "Click to play &mdash; WASD move, Mouse look, Shift sprint, Space/Ctrl up/down, Esc pause</div>";
document.body.appendChild(instructions);

// --- Load the world splat ---
const worldSplat = new SplatMesh({
  url: "https://sparkjs.dev/assets/splats/valley.spz",
  onProgress: (progress) => {
    const pct = Math.round(progress * 100);
    updateProgress(pct, `Loading world... ${pct}%`);
  },
  onLoad: () => {
    updateProgress(100, "Ready");
    setTimeout(() => {
      loadingEl.classList.add("hidden");
      setTimeout(() => loadingEl.remove(), 500);
    }, 300);
  },
});

// Correct orientation (splats often need a rotation to be upright)
worldSplat.quaternion.set(1, 0, 0, 0);
scene.add(worldSplat);

// --- Handle resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  updateMovement(delta);
  renderer.render(scene, camera);
});
