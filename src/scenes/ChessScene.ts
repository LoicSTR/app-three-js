import {
  Scene,
  AmbientLight,
  PerspectiveCamera,
  AxesHelper,
  Vector3,
} from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import type { Viewport, Clock, Lifecycle } from "~/core";

import chessSetSrc from "/assets/models/chess_set_4k.gltf/chess_set_4k.gltf";
import type { GLTF } from "three/examples/jsm/Addons.js";

export interface MainSceneParamaters {
  clock: Clock;
  camera: PerspectiveCamera;
  viewport: Viewport;
}

export class ChessScene extends Scene implements Lifecycle {
  public clock: Clock;
  public camera: PerspectiveCamera;
  public viewport: Viewport;
  public light1: AmbientLight;

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    const axesHelper = new AxesHelper(5);
    this.add(axesHelper);

    this.light1 = new AmbientLight(0xf0ffff, 0.5);
    this.light1.position.set(2, 0, -2);

    this.camera.position.set(1.3, 1, 0.5);
    this.camera.lookAt(new Vector3(0, 0, 0));

    this.add(this.light1);
  }

  public async load(): Promise<void> {
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(chessSetSrc, resolve, undefined, reject);
    });

    this.add(gltf.scene);
  }

  public update(): void {
    const theta = Math.atan2(this.camera.position.x, this.camera.position.z);

    this.light1.position.x = Math.cos(theta + this.clock.elapsed * 0.001) * 2;
    this.light1.position.z = Math.sin(theta + this.clock.elapsed * 0.0005) * 2;
    // this.camera.rotation.y = Math.tan(theta * 0.5);
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {}
}
