import * as THREE from "three";

export class ThirdPersonCamera {
  constructor(camera, canvas, target) {
    this.camera = camera;
    this.target = target; // the character group to follow

    // Orbit state
    this.yaw = Math.PI;   // horizontal angle (radians)
    this.pitch = 0.3;     // vertical angle (radians)
    this.distance = 5;

    // Limits
    this.pitchMin = -0.3;
    this.pitchMax = 1.2;
    this.distanceMin = 1.5;
    this.distanceMax = 15;
    this.sensitivity = 0.002;
    this.scrollSpeed = 0.5;

    // Smoothing
    this.smoothing = 8;
    this.currentPos = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // Pointer lock
    this.isLocked = false;
    this.canvas = canvas;

    canvas.addEventListener("click", () => {
      if (!this.isLocked) canvas.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
      this.isLocked = document.pointerLockElement === canvas;
      if (this.onLockChange) this.onLockChange(this.isLocked);
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch += e.movementY * this.sensitivity;
      this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
    });

    canvas.addEventListener("wheel", (e) => {
      this.distance += e.deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed;
      this.distance = Math.max(this.distanceMin, Math.min(this.distanceMax, this.distance));
    }, { passive: true });
  }

  // Returns the horizontal forward direction (for character movement)
  getForward(out) {
    out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    return out;
  }

  getRight(out) {
    out.set(Math.sin(this.yaw - Math.PI / 2), 0, Math.cos(this.yaw - Math.PI / 2));
    return out;
  }

  update(delta) {
    if (!this.target) return;

    // Target look-at point: character position + height offset
    const targetPos = this.target.position;
    const lookAtY = targetPos.y + 1.2;

    // Desired camera position based on spherical coords
    const desiredPos = new THREE.Vector3(
      targetPos.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      lookAtY + Math.sin(this.pitch) * this.distance,
      targetPos.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance
    );

    const desiredLookAt = new THREE.Vector3(targetPos.x, lookAtY, targetPos.z);

    // Smooth follow
    const t = 1 - Math.exp(-this.smoothing * delta);
    this.currentPos.lerp(desiredPos, t);
    this.currentLookAt.lerp(desiredLookAt, t);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }
}
