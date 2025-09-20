import {
  Object3D,
  PlaneGeometry,
  MeshBasicMaterial,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Matrix4,
  Color,
  BufferAttribute,
  InstancedMesh,
  PerspectiveCamera,
  Vector2,
  Vector3,
  Raycaster,
  Group,
} from "three";

import type { Lifecycle } from "~/core";

import {
  CELL,
  squareToWorld,
  ORIGIN,
  FILES,
  RANKS,
  fileOf,
  rankOf,
  toAlgebraic,
  getSquareWorldPosition,
} from "~/utils/utils";

import { ModelLibrary } from "~/utils/modelLibrary";

import { Piece } from "~/objects/Piece";

import type { PieceType, PieceColor } from "~/utils/types";

const piecesType: PieceType[] = [
  "pawn",
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
];
const piecesColor: PieceColor[] = ["white", "black"];

export class Board extends Group implements Lifecycle {
  public tiles!: InstancedMesh;
  private baseColors!: Float32Array;
  private instanceColors!: Float32Array;
  public highlightedIndex: number | null = null;
  private highlightColor = new Color(1.0, 0.85, 0.0);
  private raycaster: Raycaster = new Raycaster();
  private board!: Object3D;
  private pieceTemplates: Record<string, Object3D> = {};
  public piecesGroup = new Group();
  public boardState: (Piece | null)[][];

  public constructor() {
    super();
    this.boardState = Array.from({ length: 8 }, () =>
      Array<Piece | null>(8).fill(null)
    );
    this.piecesGroup.name = "piecesGroup";
    this.add(this.piecesGroup);
    this.addInteractiveTiles();
  }

  public async load(): Promise<void> {
    const modelLibrary = new ModelLibrary();
    await modelLibrary.waitReady();
    this.board = modelLibrary.getBoard();
    this.board.position.set(0, 0, 0);
    this.add(this.board);

    for (const t of piecesType)
      for (const c of piecesColor) {
        this.pieceTemplates[t + c] = modelLibrary.getPiece(t, c);
      }
    this.placeStartingPosition();
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
    this.instanceColors = new Float32Array(FILES * RANKS * 3);
    this.tiles.instanceColor = new InstancedBufferAttribute(
      this.instanceColors,
      3
    );

    const m = new Matrix4();
    let idx = 0;
    for (let r = 0; r < RANKS; r++) {
      for (let f = 0; f < FILES; f++) {
        const c = squareToWorld(f, r, ORIGIN.y + 0.0005);
        m.makeTranslation(c.x, c.y, c.z);
        this.tiles.setMatrixAt(idx, m);
        const color = new Color(0xffffff);

        const isDark = (f + r) % 2 === 1;
        const base = isDark ? color.setHex(0x000000) : color;
        this.tiles.setColorAt(idx, base);

        const i3 = idx * 3;
        this.instanceColors[i3 + 0] = base.r;
        this.instanceColors[i3 + 1] = base.g;
        this.instanceColors[i3 + 2] = base.b;
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
    let needsUpdate = false;

    if (this.highlightedIndex !== null) {
      const prev = this.highlightedIndex;
      const i3 = prev * 3;
      this.tiles.instanceColor.array[i3 + 0] = this.baseColors[i3 + 0];
      this.tiles.instanceColor.array[i3 + 1] = this.baseColors[i3 + 1];
      this.tiles.instanceColor.array[i3 + 2] = this.baseColors[i3 + 2];
      needsUpdate = true;
    }

    this.highlightedIndex = index;

    if (index !== null) {
      const i3 = index * 3;
      this.highlightColor.toArray(this.tiles.instanceColor.array, i3);
      needsUpdate = true;
    }
    if (needsUpdate) {
      this.tiles.instanceColor!.needsUpdate = true;
    }
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
    index: number
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

  public placeStartingPosition(): void {
    this.piecesGroup.clear();

    const counts: Record<PieceType, number> = {
      pawn: 8,
      rook: 2,
      knight: 2,
      bishop: 2,
      queen: 1,
      king: 1,
    };

    const liftY = 0.01;

    for (const color of piecesColor) {
      for (const type of piecesType) {
        const template = this.pieceTemplates[type + color];
        if (!template) {
          console.warn(
            `[placeStartingPosition] template manquant: ${type}${color}`
          );
          continue;
        }

        const n = counts[type];
        for (let i = 0; i < n; i++) {
          const idxForType = type !== "queen" && type !== "king" ? i + 1 : i;

          const { file, rank } = this.initialSquareFor(type, color, idxForType);
          const meshClone = template.clone(true);
          const piece = new Piece(type, color, file, rank, meshClone);
          const pos = getSquareWorldPosition(file, rank);
          meshClone.position.set(pos.x, meshClone.position.y, pos.z);
          meshClone.updateMatrixWorld();

          this.piecesGroup.add(piece);
          this.boardState[rank][file] = piece;
        }
      }
    }
  }

  public update(): void {}

  public dispose(): void {}
}
