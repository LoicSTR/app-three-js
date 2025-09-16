import {
  Vector2,
  Vector3,
  Vector4,
  Spherical,
  Box3,
  Sphere,
  Quaternion,
  Matrix4,
  Raycaster,
  type PerspectiveCamera,
  type OrthographicCamera,
} from "three";

import CameraControls from "camera-controls";
import type { Clock, Lifecycle } from "~/core";

// Improve tree-shaking by only importing the necessary THREE subset instead
// of the whole namespace
CameraControls.install({
  THREE: {
    Vector2,
    Vector3,
    Vector4,
    Quaternion,
    Matrix4,
    Spherical,
    Box3,
    Sphere,
    Raycaster,
  },
});

export interface ControlsParameters {
  camera: PerspectiveCamera | OrthographicCamera;
  element: HTMLElement;
  clock: Clock;
}

export class Controls extends CameraControls implements Lifecycle {
  public clock: Clock;
  public element: HTMLElement;
  private startPos: Vector3 = new Vector3(-0.72, 0.27, 0.45);
  private gamePos: Vector3 = new Vector3(0, 1.2, -0.01);
  private desiredPos: Vector3 = this.startPos.clone();
  private currentPos: Vector3 = this.startPos.clone();
  private cameraTarget: Vector3 = new Vector3(0, 0, 0);
  private lerpSpeed = 5;

  public constructor({ camera, element, clock }: ControlsParameters) {
    super(camera);

    this.clock = clock;
    this.element = element;

    this.setPosition(-0.72, 0.27, 0.45);

    this.mouseButtons.left = CameraControls.ACTION.NONE;
    this.mouseButtons.right = CameraControls.ACTION.NONE;
    this.mouseButtons.wheel = CameraControls.ACTION.NONE;
    this.touches.one = CameraControls.ACTION.NONE;
    this.touches.two = CameraControls.ACTION.NONE;
    this.touches.three = CameraControls.ACTION.NONE;
  }

  private onScroll = (): void => {
    const max = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    let p = Math.min(1, Math.max(0, window.scrollY / max));
    p = p * p * (3 - 2 * p);
    this.desiredPos.copy(this.startPos).lerp(this.gamePos, p);
  };

  public start(): void {
    this.disconnect();
    this.connect(this.element);
    window.addEventListener("scroll", this.onScroll, { passive: true });
  }

  public stop(): void {
    this.disconnect();
    window.removeEventListener("scroll", this.onScroll);
  }

  public update = (): boolean => {
    const delta = Math.min(1, this.clock.delta / 1000);
    this.currentPos.lerp(
      this.desiredPos,
      1 - Math.exp(-this.lerpSpeed * delta)
    );

    this.setLookAt(
      this.currentPos.x,
      this.currentPos.y,
      this.currentPos.z,
      this.cameraTarget.x,
      this.cameraTarget.y,
      this.cameraTarget.z,
      false
    );

    return super.update(this.clock.delta / 1000);
  };
}
