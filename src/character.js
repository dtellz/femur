import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODEL_URL = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb";
const MODEL_SCALE = 0.35;
const CROSSFADE_DURATION = 0.2;

export async function createCharacter() {
  const group = new THREE.Group();

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(MODEL_URL);
  const model = gltf.scene;

  model.scale.setScalar(MODEL_SCALE);
  model.rotation.y = 0;
  group.add(model);

  // Animation setup
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};
  for (const clip of gltf.animations) {
    clips[clip.name] = mixer.clipAction(clip);
  }

  // Start in idle
  const idle = clips["Idle"];
  const walk = clips["Walking"];
  const run = clips["Running"];

  if (idle) idle.play();

  let currentAction = idle;

  function crossfadeTo(nextAction) {
    if (!nextAction || nextAction === currentAction) return;
    nextAction.reset().setEffectiveWeight(1).play();
    if (currentAction) currentAction.crossFadeTo(nextAction, CROSSFADE_DURATION, true);
    currentAction = nextAction;
  }

  group.userData = {
    mixer,
    setAnimationState(moving, sprinting) {
      if (!moving) {
        crossfadeTo(idle);
      } else if (sprinting) {
        crossfadeTo(run);
      } else {
        crossfadeTo(walk);
      }
    },
  };

  return group;
}

export class CharacterController {
  constructor(character, splatMeshes) {
    this.character = character;
    this.splatMeshes = splatMeshes;

    // Physics state
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.isMoving = false;

    // Physics constants
    this.gravity = -15;
    this.jumpSpeed = 6;
    this.moveSpeed = 3.5;
    this.sprintMultiplier = 2.0;
    this.groundOffset = 0;

    // Raycast helpers
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 50;
    this.rayOrigin = new THREE.Vector3();
    this.rayDir = new THREE.Vector3(0, -1, 0);

    // Ground sampling
    this.groundY = null;
    this.frameCount = 0;
    this.sampleInterval = 2;
    this.probeHeight = 10;

    // Smooth rotation
    this.targetRotationY = 0;
    this.rotationSpeed = 10;
  }

  sampleGround() {
    const pos = this.character.position;
    this.rayOrigin.set(pos.x, pos.y + this.probeHeight, pos.z);

    this.raycaster.set(this.rayOrigin, this.rayDir);
    const hits = this.raycaster.intersectObjects(this.splatMeshes, false);

    if (hits.length > 0) {
      this.groundY = hits[0].point.y + this.groundOffset;
      return true;
    }
    return false;
  }

  update(delta, inputDir, jump, sprint) {
    // --- Horizontal movement ---
    const speed = this.moveSpeed * (sprint ? this.sprintMultiplier : 1) * delta;
    this.character.position.x += inputDir.x * speed;
    this.character.position.z += inputDir.z * speed;

    // Smooth rotation toward movement direction
    this.isMoving = inputDir.x !== 0 || inputDir.z !== 0;
    if (this.isMoving) {
      this.targetRotationY = Math.atan2(inputDir.x, inputDir.z);
      // Smooth lerp toward target angle
      let diff = this.targetRotationY - this.character.rotation.y;
      // Wrap to [-PI, PI]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.character.rotation.y += diff * Math.min(1, this.rotationSpeed * delta);
    }

    // --- Animation ---
    if (this.character.userData.setAnimationState) {
      this.character.userData.setAnimationState(this.isMoving, sprint && this.isMoving);
    }
    if (this.character.userData.mixer) {
      this.character.userData.mixer.update(delta);
    }

    // --- Ground detection ---
    this.frameCount++;
    if (this.frameCount % this.sampleInterval === 0 || this.groundY === null) {
      this.sampleGround();
    }

    // --- Vertical physics ---
    if (jump && this.grounded) {
      this.velocity.y = this.jumpSpeed;
      this.grounded = false;
    }

    this.velocity.y += this.gravity * delta;
    this.character.position.y += this.velocity.y * delta;

    // Ground collision
    if (this.groundY !== null && this.character.position.y <= this.groundY) {
      this.character.position.y = this.groundY;
      this.velocity.y = 0;
      this.grounded = true;
    } else if (this.groundY === null) {
      if (this.character.position.y <= -10) {
        this.character.position.set(0, 5, 0);
        this.velocity.y = 0;
      }
    } else {
      this.grounded = false;
    }
  }
}
