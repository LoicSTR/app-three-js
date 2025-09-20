import { Object3D, Group } from "three";
import type { Lifecycle } from "~/core";
import type { PieceType, PieceColor } from "~/utils/types";
import { squareToWorld } from "~/utils/utils";

export class Piece extends Group implements Lifecycle {
  readonly type: PieceType;
  readonly color: PieceColor;
  public file: number;
  public rank: number;
  private mesh: Object3D;

  public constructor(
    type: PieceType,
    color: PieceColor,
    file: number,
    rank: number,
    mesh: Object3D
  ) {
    super();
    this.type = type;
    this.color = color;
    this.file = file;
    this.rank = rank;
    this.mesh = mesh;
    this.add(mesh);
    this.name = `piece_${type}_${color}`;
    this.castShadow = true;
    this.receiveShadow = true;
  }

  setSquare(file: number, rank: number, lift = 0.01) {
    this.file = file;
    this.rank = rank;
    const p = squareToWorld(file, rank, 0);
    this.position.set(p.x, p.y + lift, p.z);
  }

  public async load(): Promise<void> {}

  public update(): void {}

  public dispose(): void {}
}
