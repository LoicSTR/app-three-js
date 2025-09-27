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

import { Chess } from "chess.js";

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
  chess: Chess;
}

export class Controls extends CameraControls implements Lifecycle {
  public clock: Clock;
  public element: HTMLElement;
  public chess: Chess;

  private blackPos: Vector3 = new Vector3(0, 1.2, 0);
  private whitePos: Vector3 = new Vector3(0, 1.2, -0.01);

  private cameraTarget: Vector3 = new Vector3(0, 0, 0);

  private lastTurn: "w" | "b" = "w";

  public isAtGameView(threshold = 5e-3): boolean {
    // return this.currentPos.distanceTo(this.gamePos) < threshold;
    return true;
  }

  public constructor({ camera, element, clock, chess }: ControlsParameters) {
    super(camera);

    this.clock = clock;
    this.element = element;
    this.chess = chess;

    // this.setPosition(-0.72, 0.27, 0.45);
    this.setPosition(this.whitePos.x, this.whitePos.y, this.whitePos.z);

    // this.mouseButtons.left = CameraControls.ACTION.NONE;
    // this.mouseButtons.right = CameraControls.ACTION.NONE;
    // this.mouseButtons.wheel = CameraControls.ACTION.NONE;
    // this.touches.one = CameraControls.ACTION.NONE;
    // this.touches.two = CameraControls.ACTION.NONE;
    // this.touches.three = CameraControls.ACTION.NONE;
  }

  // private onScroll = (): void => {
  //   const max = Math.max(
  //     1,
  //     document.documentElement.scrollHeight - window.innerHeight
  //   );
  //   let p = Math.min(1, Math.max(0, window.scrollY / max));
  //   p = p * p * (3 - 2 * p);
  //   this.desiredPos.copy(this.startPos).lerp(this.gamePos, p);
  // };

  public start(): void {
    this.disconnect();
    this.connect(this.element);

    this.applyTurn(this.chess.turn());
    // window.addEventListener("scroll", this.onScroll, { passive: true });
  }

  public stop(): void {
    this.disconnect();
    // window.removeEventListener("scroll", this.onScroll);
  }

  public applyTurn(turn: "w" | "b") {
    this.lastTurn = turn;
    const p = turn === "w" ? this.whitePos : this.blackPos;

    setTimeout(() => {
      this.setLookAt(
        p.x,
        p.y,
        p.z,
        this.cameraTarget.x,
        this.cameraTarget.y,
        this.cameraTarget.z,
        true
      );
    }, 500);
  }

  public update = (): boolean => {
    const t = this.chess.turn();
    if (t !== this.lastTurn) {
      this.applyTurn(t);
    }

    return super.update(this.clock.delta / 1000);
  };
}
