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
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Matrix4,
  Color,
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

const FILES = 8,
  RANKS = 8;
const CELL = 0.057888;
const ORIGIN = new Vector3(-0.2026083, 0.0173927, -0.2026083);

function squareToWorld(file: number, rank: number, y = ORIGIN.y) {
  return new Vector3(ORIGIN.x + file * CELL, y, ORIGIN.z + rank * CELL);
}

export class ChessScene extends Scene implements Lifecycle {
  public clock: Clock;
  public camera: PerspectiveCamera;
  public viewport: Viewport;
  public mesh?: Mesh<BufferGeometry, MeshStandardMaterial>;
  public light1: DirectionalLight;
  public light2: DirectionalLight;
  public light3: DirectionalLight;
  public tiles!: InstancedMesh;
  public piece!: Mesh;
  private pieceBase!: Vector3;
  private pieceUp = new Vector3(0, 1, 0);

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;
    this.background = new TextureLoader().load(
      "/assets/textures/chess_board_nor_4k.jpg"
    );

    const axesHelper = new AxesHelper(10);
    this.add(axesHelper);

    this.light1 = new DirectionalLight(0xffffff, 0.75);
    // this.light1.position.set(0, 1, 0);
    this.light1.position.set(1, 0.5, 0);
    this.light1.lookAt(new Vector3(0, 0, 0));

    this.light2 = new DirectionalLight(0x89cff0, 0.5);
    this.light2.position.set(0, 0.5, -1);
    this.light2.lookAt(new Vector3(0, 0, 0));

    this.light3 = new DirectionalLight(0xee4b2b, 0.5);
    this.light3.position.set(0, 0.5, 1);
    this.light3.lookAt(new Vector3(0, 0, 0));

    this.add(this.light1);
    this.add(this.light2);
    this.add(this.light3);
    this.addInteractiveTiles();
  }

  private addInteractiveTiles() {
    const geom = new PlaneGeometry(CELL, CELL);
    geom.rotateX(-Math.PI / 2); // à plat sur XZ
    const mat = new MeshBasicMaterial({
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      vertexColors: true,
    });

    this.tiles = new InstancedMesh(geom, mat, FILES * RANKS);
    this.tiles.instanceMatrix.setUsage(DynamicDrawUsage);
    this.tiles.instanceColor = new InstancedBufferAttribute(
      new Float32Array(FILES * RANKS * 3),
      3
    );

    const m = new Matrix4();
    let idx = 0;
    for (let r = 0; r < RANKS; r++) {
      for (let f = 0; f < FILES; f++) {
        const c = squareToWorld(f, r, ORIGIN.y + 0.0005);
        m.makeTranslation(c.x, c.y, c.z);
        this.tiles.setMatrixAt(idx, m);

        const isDark = (f + r) % 2 === 1;
        const base = isDark ? new Color(0x444444) : new Color(0xcccccc);
        this.tiles.setColorAt(idx, base);
        idx++;
      }
    }

    this.tiles.instanceMatrix.needsUpdate = true;
    this.tiles.instanceColor!.needsUpdate = true;

    this.add(this.tiles);
  }

  public async load(): Promise<void> {
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(chessSetSrc, resolve, undefined, reject);
    });

    gltf.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        this.mesh = gltf.scene.children[0] as Mesh<
          BufferGeometry,
          MeshStandardMaterial
        >;
        this.mesh.material.roughness = -7;
        this.mesh.material.metalness = 7;
      }
    });

    this.add(gltf.scene);

    const targetName = "piece_pawn_white_04";
    gltf.scene.traverse((obj) => {
      if (obj.name === targetName) {
        this.piece = obj as Mesh;
        console.log(this.piece.position.y);
      }
    });
    this.pieceBase = this.piece.position.set(
      this.piece.position.x,
      this.piece.position.y,
      this.piece.position.z + 0.115
    );
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
