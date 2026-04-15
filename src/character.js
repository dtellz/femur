import * as THREE from "three";

const CAPSULE_RADIUS = 0.25;
const CAPSULE_HEIGHT = 1.0;
const TOTAL_HEIGHT = CAPSULE_HEIGHT + CAPSULE_RADIUS * 2;

export function createCharacter() {
  const group = new THREE.Group();

  // Capsule body
  const bodyGeo = new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HEIGHT, 8, 16);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x44aaff });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = TOTAL_HEIGHT / 2;
  group.add(body);

  // Eye dots so you can tell which way the character faces
  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.1, TOTAL_HEIGHT * 0.75, -CAPSULE_RADIUS + 0.02);
  rightEye.position.set(0.1, TOTAL_HEIGHT * 0.75, -CAPSULE_RADIUS + 0.02);
  group.add(leftEye, rightEye);

  return group;
}

export class CharacterController {
  constructor(character, splatMeshes) {
    this.character = character;
    this.splatMeshes = splatMeshes; // array of SplatMesh to raycast against

    // Physics state
    this.velocity = new THREE.Vector3();
    this.grounded = false;

    // Physics constants
    this.gravity = -15;
    this.jumpSpeed = 6;
    this.moveSpeed = 3.5;
    this.sprintMultiplier = 2.0;
    this.groundOffset = 0; // feet Y offset above raycast hit

    // Raycast helpers
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 50;
    this.rayOrigin = new THREE.Vector3();
    this.rayDir = new THREE.Vector3(0, -1, 0);

    // Ground sampling: cache ground height and update every N frames
    this.groundY = null;
    this.frameCount = 0;
    this.sampleInterval = 2; // raycast every N frames

    // Capsule dimensions for ground probe
    this.feetOffset = 0;
    this.probeHeight = 10; // cast from this far above character base
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

    // Face movement direction
    if (inputDir.x !== 0 || inputDir.z !== 0) {
      const angle = Math.atan2(inputDir.x, inputDir.z);
      this.character.rotation.y = angle;
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
      // No ground found - use a fallback floor
      if (this.character.position.y <= -10) {
        this.character.position.set(0, 5, 0);
        this.velocity.y = 0;
      }
    } else {
      this.grounded = false;
    }
  }
}
