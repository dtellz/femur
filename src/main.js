import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { createCharacter, CharacterController } from "./character.js";
import { ThirdPersonCamera } from "./third-person-camera.js";

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- Spark renderer ---
const spark = new SparkRenderer({ renderer });
scene.add(spark);

// --- Input tracking ---
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  // Prevent Space from scrolling the page
  if (e.code === "Space") e.preventDefault();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

// --- Loading UI ---
const loadingEl = document.getElementById("loading");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");

function updateProgress(pct, msg) {
  progressFill.style.width = `${pct}%`;
  if (msg) progressText.textContent = msg;
}

// --- Load the world splat ---
const worldSplat = new SplatMesh({
  url: "https://sparkjs.dev/assets/splats/valley.spz",
  raycastable: true,
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

worldSplat.quaternion.set(1, 0, 0, 0);
scene.add(worldSplat);

// --- Character ---
const character = createCharacter();
character.position.set(0, 3, 0); // start slightly above to drop onto ground
scene.add(character);

const controller = new CharacterController(character, [worldSplat]);

// --- Third-person camera ---
const camController = new ThirdPersonCamera(camera, renderer.domElement, character);

// Initialize camera position behind character
camController.currentPos.set(
  character.position.x,
  character.position.y + 3,
  character.position.z + 5
);
camController.currentLookAt.copy(character.position);

// --- HUD ---
const crosshair = document.createElement("div");
crosshair.style.cssText =
  "position:fixed;top:50%;left:50%;width:8px;height:8px;transform:translate(-50%,-50%);" +
  "background:rgba(255,255,255,0.5);border-radius:50%;pointer-events:none;display:none;z-index:5;";
document.body.appendChild(crosshair);

const instructions = document.createElement("div");
instructions.style.cssText =
  "position:fixed;bottom:2rem;left:0;right:0;display:flex;justify-content:center;" +
  "pointer-events:none;z-index:5;";
instructions.innerHTML =
  '<div style="background:rgba(0,0,0,0.7);color:#aaa;padding:0.5rem 1.2rem;border-radius:6px;' +
  'font-family:system-ui,sans-serif;font-size:0.8rem;letter-spacing:0.03em;">' +
  "Click to play &mdash; WASD move, Mouse look, Shift sprint, Space jump, Scroll zoom, Esc pause</div>";
document.body.appendChild(instructions);

const debugEl = document.createElement("div");
debugEl.style.cssText =
  "position:fixed;top:1rem;left:1rem;color:#666;font-family:monospace;font-size:0.7rem;" +
  "pointer-events:none;z-index:5;line-height:1.5;";
document.body.appendChild(debugEl);

camController.onLockChange = (locked) => {
  crosshair.style.display = locked ? "block" : "none";
  instructions.style.display = locked ? "none" : "flex";
};

// --- Handle resize ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop ---
const clock = new THREE.Clock();
const inputDir = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05); // cap delta to avoid physics explosions

  // --- Build input direction relative to camera ---
  inputDir.set(0, 0, 0);

  if (camController.isLocked) {
    camController.getForward(forward);
    camController.getRight(right);

    if (keys["KeyW"]) inputDir.add(forward);
    if (keys["KeyS"]) inputDir.sub(forward);
    if (keys["KeyD"]) inputDir.add(right);
    if (keys["KeyA"]) inputDir.sub(right);

    if (inputDir.length() > 0) inputDir.normalize();
  }

  const jump = camController.isLocked && !!keys["Space"];
  const sprint = !!keys["ShiftLeft"];

  // --- Update systems ---
  controller.update(delta, inputDir, jump, sprint);
  camController.update(delta);

  // --- Debug HUD ---
  const pos = character.position;
  debugEl.textContent =
    `pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}\n` +
    `vel Y: ${controller.velocity.y.toFixed(1)}  grounded: ${controller.grounded}\n` +
    `ground Y: ${controller.groundY !== null ? controller.groundY.toFixed(2) : "none"}`;

  renderer.render(scene, camera);
});
