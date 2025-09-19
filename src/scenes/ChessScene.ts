import {
  Scene,
  DirectionalLight,
  PerspectiveCamera,
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
  ShaderMaterial,
  type Texture,
  Object3D,
} from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import type { Viewport, Clock, Lifecycle } from "~/core";

const chessSetSrc =
  import.meta.env.BASE_URL +
  "/assets/models/chess_set_4k.gltf/chess_set_4k.gltf";
import type { GLTF } from "three/examples/jsm/Addons.js";

import vertexShader from "~/shaders/chess.vert";
import fragmentShader from "~/shaders/chess.frag";

const noiseMapSrc =
  import.meta.env.BASE_URL + "/assets/textures/perlin-noise.png";

import {
  FILES,
  RANKS,
  CELL,
  ORIGIN,
  squareToWorld,
  toAlgebraic,
  fileOf,
  rankOf,
  getSquareWorldPosition,
} from "~/utils/utils";

export interface MainSceneParamaters {
  clock: Clock;
  camera: PerspectiveCamera;
  viewport: Viewport;
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

type Piece = {
  type: PieceType;
  color: PieceColor;
  file: number;
  rank: number;
  index: number;
};

export const position: Piece[] = [
  { type: "king", color: "white", file: 5, rank: 0, index: 0 },
  { type: "rook", color: "white", file: 3, rank: 6, index: 1 },
  { type: "rook", color: "white", file: 1, rank: 6, index: 2 },
  { type: "knight", color: "white", file: 4, rank: 3, index: 1 },
  { type: "pawn", color: "white", file: 7, rank: 1, index: 1 },
  { type: "pawn", color: "white", file: 6, rank: 1, index: 2 },
  { type: "pawn", color: "white", file: 5, rank: 1, index: 3 },
  { type: "pawn", color: "white", file: 4, rank: 5, index: 4 },
  { type: "pawn", color: "white", file: 1, rank: 4, index: 5 },

  { type: "king", color: "black", file: 2, rank: 7, index: 0 },
  { type: "rook", color: "black", file: 4, rank: 7, index: 1 },
  { type: "rook", color: "black", file: 0, rank: 7, index: 2 },
  { type: "knight", color: "black", file: 4, rank: 4, index: 1 },
  { type: "pawn", color: "black", file: 7, rank: 5, index: 1 },
  { type: "pawn", color: "black", file: 6, rank: 4, index: 2 },
  { type: "pawn", color: "black", file: 0, rank: 6, index: 3 },
];

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
  private raycaster: Raycaster = new Raycaster();
  private baseColors!: Float32Array;
  private highlightedIndex: number | null = null;
  public shader!: ShaderMaterial;
  private checkmateFx = { active: false, t0: 0 };
  private shaderTargets: Set<Mesh> = new Set();
  private originalMaterials = new Map<Mesh, any>();
  private effectDuration = 5.0;
  public toOutline: Object3D[] = [];
  public boardState: BoardState = Array.from({ length: 8 }, () =>
    Array(8).fill(null)
  );
  public pieceRegistry: PieceRegistry = new Map();

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    this.background = new TextureLoader().load(
      "/assets/textures/chess_board_nor_4k.jpg"
    );

    this.light1 = new DirectionalLight(0xffffff, 0.75);
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

    const file = fileOf(index);
    const rank = rankOf(index);
    const world = squareToWorld(file, rank, ORIGIN.y + 0.0005);
    const algebraic = toAlgebraic(file, rank);

    this.highlightIndex(index);

    return { file, rank, index, algebraic, world };
  }

  public initialSquareFor(
    type: PieceType,
    color: PieceColor,
    index?: number,
    isCustom: boolean = false
  ): { file: number; rank: number } | null {
    const back = color === "white" ? 0 : 7;
    const pawn = color === "white" ? 1 : 6;
    const idx = Number.isFinite(index as number) ? (index as number) : 0;

    if (isCustom) {
      const custom = position.find(
        (p) => p.type === type && p.color === color && p.index === idx
      );
      if (custom) return { file: custom.file, rank: custom.rank };
    } else {
      switch (type) {
        case "pawn": {
          const file = Math.max(0, Math.min(7, idx - 1));
          return { file, rank: pawn };
        }
        case "king":
          return { file: 3, rank: back };
        case "queen":
          return { file: 4, rank: back };
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
    return null;
  }

  public getPieceAt(file: number, rank: number): PieceRecord | null {
    const id = this.boardState[rank][file];
    return id ? this.pieceRegistry.get(id)! : null;
  }

  public async animateMove(
    id: string,
    toFile: number,
    toRank: number,
    duration = 0.4
  ): Promise<void> {
    const piece = this.pieceRegistry.get(id);
    if (!piece) return;

    const occupyingId = this.boardState[toRank][toFile];

    const start = piece.mesh.position.clone();
    const endWorld = getSquareWorldPosition(toFile, toRank);
    const end = new Vector3(endWorld.x, start.y, endWorld.z);

    const startTime = performance.now();
    const ease = (t: number) => t * t * (3 - 2 * t);

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
          if (occupyingId && occupyingId !== id) {
            this.removePieceById(occupyingId);
          }
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

  public removePieceById(id: string): void {
    const rec = this.pieceRegistry.get(id);
    if (!rec) return;
    if (this.boardState[rec.rank][rec.file] === id) {
      this.boardState[rec.rank][rec.file] = null;
    }
    this.pieceRegistry.delete(id);
    if (rec.mesh.parent) rec.mesh.parent.remove(rec.mesh);
  }

  public captureAt(file: number, rank: number): void {
    const id = this.boardState[rank][file];
    if (!id) return;
    this.removePieceById(id);
  }

  public triggerCheckmateEffect(): void {
    if (!this.shader) return;
    this.checkmateFx.active = true;
    this.checkmateFx.t0 = performance.now();
    this.applyShaderToTargets();
    this.shader.uniforms.uCheckmate.value = 1.0;
    this.shader.uniforms.uTime.value = 0.0;
    const endText = document.querySelector(".endText") as HTMLElement;
    endText.innerText = "You win!";
    endText.style.opacity = "1.0";
    this.light1.intensity = 0;
    this.light2.intensity = 0.75;
    this.light3.intensity = 0.75;
  }

  public async load(): Promise<void> {
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(chessSetSrc, resolve, undefined, reject);
    });

    const texLoader = new TextureLoader();
    const kingChessmateTex = await new Promise<Texture>((resolve, reject) => {
      texLoader.load(noiseMapSrc, resolve, reject);
    });

    this.shader = new ShaderMaterial({
      uniforms: {
        uNoiseMap: { value: kingChessmateTex },
        uTime: { value: 0 },
        uCheckmate: { value: 0 },
        uScale: { value: 4.0 },
        uSpeed: { value: 0.25 },
        uThreshold: { value: 0.5 },
        uEdge: { value: 0.08 },
        uGlowColor: { value: new Color(0xfff2a8) },
        uGlowStrength: { value: 1.25 },
      },
      vertexShader,
      fragmentShader,
      transparent: false,
      depthWrite: true,
    });

    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) this.boardState[r][f] = null;
    this.pieceRegistry.clear();

    gltf.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        this.mesh = child as Mesh<BufferGeometry, MeshStandardMaterial>;
        if (this.mesh.name.includes("king_black")) {
          this.shaderTargets.add(this.mesh);
        }
      }
      if (child.name.startsWith("piece_")) {
        if (child.type === "Group") {
          child.traverse((c) => {
            if (c.type === "Mesh") {
              this.toOutline.push(c);
            }
          });
        } else {
          this.toOutline.push(child);
        }

        const mesh = child as Mesh;
        const parts = child.name.split("_");
        const type = parts[1] as PieceType;
        const color = parts[2] as PieceColor;
        const rawIndex = parseInt(parts[3]);
        const id = rawIndex
          ? `${color[0]}_${type}_${rawIndex}`
          : `${color[0]}_${type}`;

        const sq = this.initialSquareFor(type, color, rawIndex, true);
        if (!sq) {
          mesh.visible = false;
          return;
        }
        const { file, rank } = sq;

        const pos = getSquareWorldPosition(file, rank);
        mesh.position.set(pos.x, mesh.position.y, pos.z);
        mesh.visible = true;
        mesh.updateMatrixWorld();

        this.pieceRegistry.set(id, { id, type, color, file, rank, mesh });
        this.boardState[rank][file] = id;
      }
    });

    this.add(gltf.scene);
  }

  private applyShaderToTargets(): void {
    for (const mesh of this.shaderTargets) {
      if (!this.originalMaterials.has(mesh)) {
        this.originalMaterials.set(mesh, mesh.material);
      }
      mesh.material = this.shader;
    }
  }

  private restoreOriginalMaterials(): void {
    for (const mesh of this.shaderTargets) {
      const orig = this.originalMaterials.get(mesh);
      if (orig) mesh.material = orig;
    }
    this.originalMaterials.clear();
  }

  public update(): void {
    if (this.checkmateFx.active && this.shader) {
      const t = (performance.now() - this.checkmateFx.t0) / 1000;
      this.shader.uniforms.uTime.value = t;

      const p = Math.min(1, t / this.effectDuration);
      const strength = Math.sin(p * 3.14159265);
      this.shader.uniforms.uGlowStrength.value = strength;

      if (t > this.effectDuration) {
        this.checkmateFx.active = false;
        this.shader.uniforms.uCheckmate.value = 0.0;
        this.restoreOriginalMaterials();
      }
    }
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {}
}
