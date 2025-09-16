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

  public constructor({ camera, element, clock }: ControlsParameters) {
    super(camera);

    this.clock = clock;
    this.element = element;

    // this.setPosition(-0.72, 0.27, 0.45);
    this.setPosition(0, 1.2, -0.01);
    // const startPos = new Vector3(-0.72, 0.27, 0.45);
    // const gamePos = new Vector3(0, 1.2, -0.01);
    // const target = new Vector3(0, 0, 0);

    this.mouseButtons.left = CameraControls.ACTION.NONE;
    this.mouseButtons.right = CameraControls.ACTION.NONE;
    this.mouseButtons.wheel = CameraControls.ACTION.NONE;
    this.touches.one = CameraControls.ACTION.NONE;
    this.touches.two = CameraControls.ACTION.NONE;
    this.touches.three = CameraControls.ACTION.NONE;

    this.addEventListener("rest", () => {
      this.camera.position.set(-0.72, 0.27, 0.45);
    });

    // cameraControls.addEventListener("change", () => {
    //   console.log(cameraControls.getPosition(cameraControls._position0));
    // });
  }

  public start(): void {
    this.disconnect();
    this.connect(this.element);
  }

  public stop(): void {
    this.disconnect();
  }

  public update = (): boolean => {
    console.log(this.getPosition(this._position0));

    return super.update(this.clock.delta / 1000);
  };
}
