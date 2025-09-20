import { Group, Object3D, Mesh, MeshStandardMaterial } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import type { PieceType, PieceColor } from "~/objects/Piece";

const modelsUrl = `${
  import.meta.env.BASE_URL
}models/chess_set_1k.gltf/chess_set_1k.gltf`;

export class ModelLibrary {
  private gltfRoot!: Object3D;
  private map: Record<string, Object3D> = {};
  private ready: Promise<void>;

  constructor() {
    const loader = new GLTFLoader();
    this.ready = new Promise((resolve, reject) => {
      loader.load(
        modelsUrl,
        (g) => {
          this.gltfRoot = g.scene;
          this.indexNodes();
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  async waitReady() {
    await this.ready;
  }

  private indexNodes() {
    const nodes: Record<string, string> = {
      Board: "board",
      King_White: "piece_king_white",
      Queen_White: "piece_queen_white",
      Rook_White: "piece_rook_white_01",
      Bishop_White: "piece_bishop_white_01",
      Knight_White: "piece_knight_white_01",
      Pawn_White: "piece_pawn_white_01",
      King_Black: "piece_king_black",
      Queen_Black: "piece_queen_black",
      Rook_Black: "piece_rook_black_01",
      Bishop_Black: "piece_bishop_black_01",
      Knight_Black: "piece_knight_black_01",
      Pawn_Black: "piece_pawn_black_01",
    };

    for (const key in nodes) {
      const name = nodes[key];
      const node = this.gltfRoot.getObjectByName(name);
      if (node) {
        this.map[key] = node;
      }
      if (!this.map[key]) {
        console.warn(`[ModelLibrary] Node manquant : ${key} (${nodes[key]})`);
      }
    }
  }

  getBoard(): Object3D {
    const src = this.map["Board"];
    return src ? this.cloneDeep(src) : new Group();
  }

  getPiece(type: PieceType, color: PieceColor): Object3D {
    const key = `${capitalize(type)}_${capitalize(color)}`; // ex: King_White
    const src = this.map[key];
    return src ? this.cloneDeep(src) : new Group();
  }

  private cloneDeep<T extends Object3D>(src: T): T {
    const clone = src.clone(true) as T;
    clone.traverse((o) => {
      if (o instanceof Mesh) {
        o.material = (o.material as MeshStandardMaterial).clone();
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return clone;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
