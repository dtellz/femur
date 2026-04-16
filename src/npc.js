import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const CROSSFADE_DURATION = 0.25;
const loader = new GLTFLoader();

// Cache loaded models so we don't re-download
const modelCache = new Map();

async function loadModel(url) {
  if (modelCache.has(url)) return modelCache.get(url);
  const gltf = await loader.loadAsync(url);
  modelCache.set(url, gltf);
  return gltf;
}

function cloneGltf(gltf) {
  const clone = gltf.scene.clone(true);
  const sourceSkinnedMeshes = [];
  gltf.scene.traverse((node) => {
    if (node.isSkinnedMesh) sourceSkinnedMeshes.push(node);
  });

  // Re-bind skeletons on cloned skinned meshes
  let i = 0;
  clone.traverse((node) => {
    if (node.isSkinnedMesh) {
      const source = sourceSkinnedMeshes[i++];
      const skeleton = source.skeleton;

      // Find cloned bones by name
      const bones = skeleton.bones.map((bone) => {
        let found;
        clone.traverse((n) => { if (n.name === bone.name) found = n; });
        return found || bone;
      });

      node.bind(new THREE.Skeleton(bones, skeleton.boneInverses), node.bindMatrix);
    }
  });

  return clone;
}

// NPC model presets
export const NPC_MODELS = {
  soldier: {
    url: "https://threejs.org/examples/models/gltf/Soldier.glb",
    scale: 0.65,
    rotationY: Math.PI,
    idleClip: "Idle",
    walkClip: "Walk",
    runClip: "Run",
  },
  robot: {
    url: "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
    scale: 0.35,
    rotationY: 0,
    idleClip: "Idle",
    walkClip: "Walking",
    runClip: "Running",
  },
};

export class NPC {
  constructor(preset, spawnPos, splatMeshes, wanderRadius = 3) {
    this.group = new THREE.Group();
    this.group.position.copy(spawnPos);
    this.preset = preset;
    this.splatMeshes = splatMeshes;
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this.ready = false;

    // Wandering AI state
    this.spawnPos = spawnPos.clone();
    this.wanderRadius = wanderRadius;
    this.targetPos = new THREE.Vector3();
    this.state = "idle"; // idle | walking
    this.stateTimer = 0;
    this.idleDuration = 0;
    this.walkSpeed = 1.2;

    // Ground raycasting (same approach as player CharacterController)
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 50;
    this.rayOrigin = new THREE.Vector3();
    this.rayDir = new THREE.Vector3(0, -1, 0);
    this.groundY = null;
    this.velocity = 0;
    this.gravity = -15;
    this.grounded = false;
    this.probeHeight = 10;
    this.frameCount = 0;
    this.sampleInterval = 2;

    this._pickNewTarget();
    this._pickIdleDuration();
  }

  async load() {
    const gltf = await loadModel(this.preset.url);
    const model = cloneGltf(gltf);

    model.scale.setScalar(this.preset.scale);
    model.rotation.y = this.preset.rotationY;
    this.group.add(model);

    // Set up animations
    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) {
      this.actions[clip.name] = this.mixer.clipAction(clip.clone(), model);
    }

    // Start idle
    const idle = this.actions[this.preset.idleClip];
    if (idle) {
      idle.play();
      this.currentAction = idle;
    }

    this.ready = true;
  }

  _crossfadeTo(name) {
    const next = this.actions[name];
    if (!next || next === this.currentAction) return;
    next.reset().setEffectiveWeight(1).play();
    if (this.currentAction) this.currentAction.crossFadeTo(next, CROSSFADE_DURATION, true);
    this.currentAction = next;
  }

  _pickNewTarget() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.wanderRadius;
    this.targetPos.set(
      this.spawnPos.x + Math.cos(angle) * dist,
      this.group.position.y,
      this.spawnPos.z + Math.sin(angle) * dist
    );
  }

  _pickIdleDuration() {
    this.idleDuration = 1.5 + Math.random() * 3;
  }

  _sampleGround() {
    const pos = this.group.position;
    this.rayOrigin.set(pos.x, pos.y + this.probeHeight, pos.z);
    this.raycaster.set(this.rayOrigin, this.rayDir);
    const hits = this.raycaster.intersectObjects(this.splatMeshes, false);
    if (hits.length > 0) {
      this.groundY = hits[0].point.y;
      return true;
    }
    return false;
  }

  update(delta) {
    if (!this.ready) return;
    this.mixer.update(delta);

    this.stateTimer += delta;

    // --- Ground detection ---
    this.frameCount++;
    if (this.frameCount % this.sampleInterval === 0 || this.groundY === null) {
      this._sampleGround();
    }

    // --- Gravity ---
    this.velocity += this.gravity * delta;
    this.group.position.y += this.velocity * delta;

    if (this.groundY !== null && this.group.position.y <= this.groundY) {
      this.group.position.y = this.groundY;
      this.velocity = 0;
      this.grounded = true;
    } else if (this.groundY === null && this.group.position.y <= -10) {
      // Fell off the world — reset to spawn
      this.group.position.copy(this.spawnPos);
      this.velocity = 0;
    } else {
      this.grounded = false;
    }

    // --- Wandering AI ---
    if (this.state === "idle") {
      if (this.stateTimer >= this.idleDuration) {
        this.state = "walking";
        this.stateTimer = 0;
        this._pickNewTarget();
        this._crossfadeTo(this.preset.walkClip);
      }
    } else if (this.state === "walking") {
      const pos = this.group.position;
      const dx = this.targetPos.x - pos.x;
      const dz = this.targetPos.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.2) {
        this.state = "idle";
        this.stateTimer = 0;
        this._pickIdleDuration();
        this._crossfadeTo(this.preset.idleClip);
      } else {
        const step = Math.min(this.walkSpeed * delta, dist);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;

        // Face movement direction
        const angle = Math.atan2(dx, dz);
        let diff = angle - this.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.group.rotation.y += diff * Math.min(1, 8 * delta);
      }

      if (this.stateTimer > 10) {
        this.state = "idle";
        this.stateTimer = 0;
        this._pickIdleDuration();
        this._crossfadeTo(this.preset.idleClip);
      }
    }
  }
}

/**
 * Spawn multiple NPCs around a center point.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} center - spawn area center
 * @param {Array<{preset: object, offset: THREE.Vector3, wanderRadius?: number}>} definitions
 * @param {Array} splatMeshes - SplatMesh objects to raycast against for ground detection
 * @returns {Promise<NPC[]>}
 */
export async function spawnNPCs(scene, center, definitions, splatMeshes) {
  const npcs = definitions.map(({ preset, offset, wanderRadius }) => {
    const pos = center.clone().add(offset);
    return new NPC(preset, pos, splatMeshes, wanderRadius);
  });

  // Add groups to scene immediately (position is set)
  for (const npc of npcs) scene.add(npc.group);

  // Load models in parallel
  await Promise.all(npcs.map((npc) => npc.load()));

  return npcs;
}
