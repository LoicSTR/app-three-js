import {
  Scene,
  DirectionalLight,
  PerspectiveCamera,
  // AxesHelper,
  Vector3,
  Vector2,
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
  Raycaster,
  BufferAttribute,
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

type PieceColor = "white" | "black";
type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

interface PieceRecord {
  id: string;
  type: PieceType;
  color: PieceColor;
  file: number;
  rank: number;
  mesh: Mesh;
}

type PieceRegistry = Map<string, PieceRecord>;
type BoardState = (string | null)[][];

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
  private pieceBase!: Vector3
  private raycaster: Raycaster = new Raycaster();
  private baseColors!: Float32Array;
  private highlightedIndex: number | null = null;
  public boardState: BoardState = Array.from({ length: 8 }, () => Array(8).fill(null));;
  public pieceRegistry: PieceRegistry = new Map();

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;
    this.background = new TextureLoader().load(
      "/assets/textures/chess_board_nor_4k.jpg"
    );

    // const axesHelper = new AxesHelper(10);
    // this.add(axesHelper);

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
    geom.rotateX(-Math.PI / 2);
    const vertexCount = (geom.getAttribute("position") as any).count;
    const white = new Float32Array(vertexCount * 3);
    white.fill(1);
    geom.setAttribute("color", new BufferAttribute(white, 3));
    const mat = new MeshBasicMaterial({
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
    });
    mat.color.set(0xffffff);
    mat.toneMapped = false;

    this.tiles = new InstancedMesh(geom, mat, FILES * RANKS);
    this.tiles.renderOrder = 2;
    this.tiles.position.y = 0.0005;
    this.tiles.instanceMatrix.setUsage(DynamicDrawUsage);
    this.baseColors = new Float32Array(FILES * RANKS * 3);
    const instanceColors = new Float32Array(FILES * RANKS * 3);
    this.tiles.instanceColor = new InstancedBufferAttribute(instanceColors, 3);

    const m = new Matrix4();
    let idx = 0;
    for (let r = 0; r < RANKS; r++) {
      for (let f = 0; f < FILES; f++) {
        const c = squareToWorld(f, r, ORIGIN.y + 0.0005);
        m.makeTranslation(c.x, c.y, c.z);
        this.tiles.setMatrixAt(idx, m);

        const isDark = (f + r) % 2 === 1;
        const base = isDark ? new Color(0x000000) : new Color(0xffffff);
        this.tiles.setColorAt(idx, base);
        // mirror to baseColors array for fast restore
        const i3 = idx * 3;
        instanceColors[i3 + 0] = base.r;
        instanceColors[i3 + 1] = base.g;
        instanceColors[i3 + 2] = base.b;
        this.baseColors[i3 + 0] = base.r;
        this.baseColors[i3 + 1] = base.g;
        this.baseColors[i3 + 2] = base.b;
        idx++;
      }
    }

    this.tiles.instanceMatrix.needsUpdate = true;
    this.tiles.instanceColor!.needsUpdate = true;

    this.add(this.tiles);
  }

  // --- Board utilities ---
  public squareIndex(file: number, rank: number): number {
    return rank * FILES + file;
  }

  public fileOf(index: number): number {
    return index % FILES;
  }

  public rankOf(index: number): number {
    return Math.floor(index / FILES);
  }

  public toAlgebraic(file: number, rank: number): string {
    const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
    return `${fileChar}${rank + 1}`;
  }

  public fromAlgebraic(square: string): { file: number; rank: number } {
    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return { file, rank };
  }

  public getSquareWorldPosition(file: number, rank: number): Vector3 {
    return squareToWorld(file, rank, ORIGIN.y);
  }

  private highlightIndex(index: number | null): void {
    if (!this.tiles.instanceColor) return;
    if (index === this.highlightedIndex) return;

    if (this.highlightedIndex !== null) {
      const prev = this.highlightedIndex;
      const i3 = prev * 3;
      this.tiles.instanceColor.array[i3 + 0] = this.baseColors[i3 + 0];
      this.tiles.instanceColor.array[i3 + 1] = this.baseColors[i3 + 1];
      this.tiles.instanceColor.array[i3 + 2] = this.baseColors[i3 + 2];
    }

    this.highlightedIndex = index;

    if (index !== null) {
      const i3 = index * 3;
      this.tiles.instanceColor.array[i3 + 0] = 1.0;
      this.tiles.instanceColor.array[i3 + 1] = 0.85;
      this.tiles.instanceColor.array[i3 + 2] = 0.0;
      this.tiles.instanceColor!.needsUpdate = true;
    }

    this.tiles.instanceColor.needsUpdate = true;
  }

  public pickAt(
    pointerNdc: Vector2,
    camera: PerspectiveCamera
  ): {
    file: number;
    rank: number;
    index: number;
    algebraic: string;
    world: Vector3;
  } | null {
    if (!this.tiles) return null;

    this.raycaster.setFromCamera(pointerNdc, camera);
    const intersects = this.raycaster.intersectObject(this.tiles, false);
    if (!intersects.length) {
      this.highlightIndex(null);
      return null;
    }

    const hit = intersects[0];
    const index = (hit.instanceId ?? -1) as number;
    if (index < 0) {
      this.highlightIndex(null);
      return null;
    }

    const file = this.fileOf(index);
    const rank = this.rankOf(index);
    const world = squareToWorld(file, rank, ORIGIN.y + 0.0005);
    const algebraic = this.toAlgebraic(file, rank);

    this.highlightIndex(index);

    return { file, rank, index, algebraic, world };
  }

  public initialSquareFor(
    type: PieceType,
    color: PieceColor,
    index?: number
  ): { file: number; rank: number } {
    const back = color === "white" ? 0 : 7;
    const pawn = color === "white" ? 1 : 6;
    const idx = Number.isFinite(index as number) ? (index as number) : 0;

    switch (type) {
      case "pawn": {
        const file = Math.max(0, Math.min(7, idx - 1));
        return { file, rank: pawn };
      }
      case "king":
        return { file: 4, rank: back };
      case "queen":
        return { file: 3, rank: back };
      case "rook": {
        const side = idx % 2;
        return { file: side === 0 ? 0 : 7, rank: back };
      }
      case "knight": {
        const side = idx % 2;
        return { file: side === 0 ? 1 : 6, rank: back };
      }
      case "bishop": {
        const side = idx % 2;
        return { file: side === 0 ? 2 : 5, rank: back };
      }
      default:
        return { file: 0, rank: back };
    }
  }

  public getPieceAt(file: number, rank: number): PieceRecord | null {
    const id = this.boardState[rank][file];
    return id ? this.pieceRegistry.get(id)! : null;

  }

  public async animateMove(id: string, toFile: number, toRank: number, duration = 0.4): Promise<void> {
    const piece = this.pieceRegistry.get(id);
    if (!piece) return;

    const start = piece.mesh.position.clone();
    const endWorld = this.getSquareWorldPosition(toFile, toRank);
    const end = new Vector3(endWorld.x, start.y, endWorld.z);

    const startTime = performance.now();
    const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep

    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / (duration * 1000));
        const k = ease(t);

        const pos = start.clone().lerp(end, k);
        const arc = 0.01;
        pos.y = start.y + arc * (1 - (2 * k - 1) ** 2);

        piece.mesh.position.copy(pos);
        piece.mesh.updateMatrixWorld();

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.moveRecord(id, toFile, toRank);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  public moveRecord(id: string, toFile: number, toRank: number): void {
    const piece = this.pieceRegistry.get(id)!;
    this.boardState[piece.rank][piece.file] = null;
    piece.file = toFile;
    piece.rank = toRank;
    this.boardState[toRank][toFile] = id;
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
      if ((child as Mesh).isMesh && child.name.startsWith("piece_")) {
        const mesh = child as Mesh;
        const parts = child.name.split("_");
        const type = parts[1] as PieceType;
        const color = parts[2] as PieceColor;
        const index = parseInt(parts[3]);

        const id = index ? `${color[0]}_${type}_${index}` : `${color[0]}_${type}`;

        const { file, rank } = this.initialSquareFor(type, color, index);
        this.pieceRegistry.set(id, { id, type, color, file, rank, mesh });
        this.boardState[rank][file] = id;

        const pos = this.getSquareWorldPosition(file, rank);
        mesh.position.set(pos.x, mesh.position.y, pos.z);
        mesh.updateMatrixWorld();
      }
    });

    this.add(gltf.scene);
  }

  public update(): void {
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void { }
}
