import {
  Scene,
  DirectionalLight,
  PerspectiveCamera,
  AxesHelper,
  Vector3,
  TextureLoader,
  Mesh,
  BufferGeometry,
  MeshStandardMaterial,
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
  public mesh?: Mesh<BufferGeometry, MeshStandardMaterial>;
  public light1: DirectionalLight;
  public light2: DirectionalLight;
  public light3: DirectionalLight;

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;
    this.background = new TextureLoader().load(
      "/assets/textures/chess_board_nor_4k.jpg"
    );

    const axesHelper = new AxesHelper(5);
    this.add(axesHelper);

    // this.light1 = new DirectionalLight(0xffffff, 0.25);
    // this.light1.position.set(0, 1, 0);
    this.light1 = new DirectionalLight(0xffffff, 0.75);
    this.light1.position.set(1, 0.5, 0);
    this.light1.lookAt(new Vector3(0, 0, 0));

    this.light2 = new DirectionalLight(0x89cff0, 0.5);
    this.light2.position.set(0, 0.5, -1);
    this.light2.lookAt(new Vector3(0, 0, 0));

    this.light3 = new DirectionalLight(0xee4b2b, 0.5);
    this.light3.position.set(0, 0.5, 1);
    this.light3.lookAt(new Vector3(0, 0, 0));

    // const sphereSize = 1;

    // const directionalLightHelper1 = new DirectionalLightHelper(
    //   this.light1,
    //   sphereSize
    // );
    // this.add(directionalLightHelper1);

    // const directionalLightHelper2 = new DirectionalLightHelper(
    //   this.light2,
    //   sphereSize
    // );
    // // this.add(directionalLightHelper2);

    // const directionalLightHelper3 = new DirectionalLightHelper(
    //   this.light3,
    //   sphereSize
    // );
    // // this.add(directionalLightHelper3);

    this.add(this.light1);
    this.add(this.light2);
    this.add(this.light3);
  }

  public async load(): Promise<void> {
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(chessSetSrc, resolve, undefined, reject);
    });

    this.mesh = gltf.scene.children[0] as Mesh<
      BufferGeometry,
      MeshStandardMaterial
    >;

    this.add(gltf.scene);
    this.mesh.material.roughness = -7;
    this.mesh.material.metalness = 7;
  }

  public update(): void {
    // const theta = Math.atan2(this.camera.position.x, this.camera.position.z);
    // this.camera.position.x = Math.cos(theta + this.clock.elapsed * 0.001) * 2;
    // this.camera.position.z = Math.sin(theta + this.clock.elapsed * 0.0005) * 2;
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {}
}
