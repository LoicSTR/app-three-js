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
  AdditiveBlending,
} from "three";

import type { Lifecycle } from "~/core";
import type { Square } from "chess.js";

import {
  CELL,
  squareToLocal,
  ORIGIN,
  FILES,
  RANKS,
  fileOf,
  rankOf,
  toAlgebraic,
  fromAlgebraic,
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
  private errorColor = new Color(1.0, 0.0, 0.0);
  private raycaster: Raycaster = new Raycaster();
  private board!: Object3D;
  private pieceTemplates: Record<string, Object3D> = {};
  public piecesGroup = new Group();
  public boardState: (Piece | null)[][];
  public outlineTargets: Object3D[] = [];
  private library = new ModelLibrary();

  public constructor() {
    super();
    this.boardState = Array.from({ length: 8 }, () =>
      Array<Piece | null>(8).fill(null)
    );
    this.piecesGroup.name = "piecesGroup";
    this.add(this.piecesGroup);
    this.addInteractiveTiles();
    console.log(this.boardState);
  }

  public async load(): Promise<void> {
    await this.library.waitReady();
    this.board = this.library.getBoard();
    this.board.position.set(0, 0, 0);
    this.add(this.board);

    for (const t of piecesType)
      for (const c of piecesColor) {
        this.pieceTemplates[t + c] = this.library.getPiece(t, c);
      }
    this.placeStartingPosition();
  }

  //   private collectOutlineTargets() {
  //     console.log("Gorupe", this.piecesGroup);
  //     this.outlineTargets = [];

  //     this.piecesGroup.children.forEach((piece) => {
  //       console.log("Piece", piece);
  //       // If piece is a Piece instance, push its mesh property
  //       if ((piece as Piece).mesh) {
  //         this.outlineTargets.push((piece as Piece).mesh);
  //       } else {
  //         // Otherwise, traverse and collect Meshes
  //         piece.traverse((child) => {
  //           if (child instanceof Mesh) {
  //             this.outlineTargets.push(child);
  //           }
  //         });
  //       }
  //     });
  //   }
  public setOriginY(newY: number): void {
    const dy = newY - ORIGIN.y;
    if (Math.abs(dy) < 1e-7) return;

    ORIGIN.y = newY;

    const m = new Matrix4();
    let idx = 0;
    for (let r = 0; r < RANKS; r++) {
      for (let f = 0; f < FILES; f++, idx++) {
        const c = squareToLocal(f, r, newY + 0.0001);
        this.tiles.getMatrixAt(idx, m);
        m.setPosition(c.x, c.y, c.z);
        this.tiles.setMatrixAt(idx, m);
      }
    }
    this.tiles.instanceMatrix.needsUpdate = true;
    this.tiles.updateMatrixWorld(true);

    this.piecesGroup.children.forEach((obj) => {
      const piece = obj as Piece;
      const pLocal = squareToLocal(piece.file, piece.rank, newY);
      piece.position.set(pLocal.x, pLocal.y, pLocal.z);
      piece.updateMatrixWorld(true);
    });
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
      opacity: 0.1,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      blending: AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    mat.color.set(0xffffff);
    mat.toneMapped = false;

    this.tiles = new InstancedMesh(geom, mat, FILES * RANKS);
    this.tiles.renderOrder = 2;
    this.tiles.position.y = 0;
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
        const c = squareToLocal(f, r, ORIGIN.y + 0.0001);
        m.makeTranslation(c.x, c.y, c.z);
        this.tiles.setMatrixAt(idx, m);

        const i3 = idx * 3;
        this.instanceColors[i3 + 0] = 0;
        this.instanceColors[i3 + 1] = 0;
        this.instanceColors[i3 + 2] = 0;
        this.baseColors[i3 + 0] = 0;
        this.baseColors[i3 + 1] = 0;
        this.baseColors[i3 + 2] = 0;
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
    algebraic: Square;
    world: Vector3;
    local: Vector3;
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
    const local = squareToLocal(file, rank, ORIGIN.y + 0.0001);
    const world = this.localToWorld(local.clone());

    const algebraic = toAlgebraic(file, rank);

    this.highlightIndex(index);

    return { file, rank, index, algebraic, world, local };
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

          const pLocal = squareToLocal(file, rank);
          piece.position.set(pLocal.x, pLocal.y, pLocal.z);

          piece.modelRoot.position.set(0, 0, 0);

          this.piecesGroup.add(piece);
          this.boardState[rank][file] = piece;
        }
      }
    }
  }

  public async move(
    fromSquare: string,
    toSquare: string
  ): Promise<Piece | null> {
    const { file: fromFile, rank: fromRank } = fromAlgebraic(fromSquare);
    const { file: toFile, rank: toRank } = fromAlgebraic(toSquare);

    const piece = this.boardState[fromRank][fromFile];
    if (!piece) return null;

    const captured = this.boardState[toRank][toFile];
    if (captured) {
      this.piecesGroup.remove(captured);
      captured.dispose();
    }

    this.boardState[fromRank][fromFile] = null;
    this.boardState[toRank][toFile] = piece;

    await piece.moveTo(toSquare, this);
    return piece;
  }

  public removeAt(square: Square) {
    const { file, rank } = fromAlgebraic(square);
    const p = this.boardState[rank][file];
    if (!p) return;
    this.piecesGroup.remove(p);
    p.dispose();
    this.boardState[rank][file] = null;
  }

  // public illegalMove(square: Square) {
  //   const { file, rank } = fromAlgebraic(square);

  //   if (!this.tiles.instanceColor) return;
  //   if (index === this.highlightedIndex) return;
  //   let needsUpdate = false;

  //   if (this.highlightedIndex !== null) {
  //     const prev = this.highlightedIndex;
  //     const i3 = prev * 3;
  //     this.tiles.instanceColor.array[i3 + 0] = this.baseColors[i3 + 0];
  //     this.tiles.instanceColor.array[i3 + 1] = this.baseColors[i3 + 1];
  //     this.tiles.instanceColor.array[i3 + 2] = this.baseColors[i3 + 2];
  //     needsUpdate = true;
  //   }

  //   this.highlightedIndex = index;

  //   if (index !== null) {
  //     const i3 = index * 3;
  //     this.highlightColor.toArray(this.tiles.instanceColor.array, i3);
  //     needsUpdate = true;
  //   }
  //   if (needsUpdate) {
  //     this.tiles.instanceColor!.needsUpdate = true;
  //   }
  // }

  public update(): void {}

  public dispose(): void {}
}
