import { Object3D, Group, Vector3 } from "three";
import type { Lifecycle } from "~/core";
import type { PieceType, PieceColor } from "~/utils/types";
import { fromAlgebraic, getSquareWorldPosition } from "~/utils/utils";

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

  public moveTo(toSquare: string, duration = 0.4): Promise<void> {
    const { file, rank } = fromAlgebraic(toSquare);

    const start = this.mesh.position.clone();

    const endWorld = getSquareWorldPosition(file, rank);
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

        this.mesh.position.copy(pos);
        this.mesh.updateMatrixWorld();

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  public async load(): Promise<void> {}

  public update(): void {}

  public dispose(): void {}
}
