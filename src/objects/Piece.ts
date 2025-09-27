import { Object3D, Group, Vector3, MathUtils } from "three";
import type { Lifecycle } from "~/core";
import type { PieceType, PieceColor } from "~/utils/types";
import { fromAlgebraic, getSquareWorldPosition } from "~/utils/utils";

export class Piece extends Group implements Lifecycle {
  readonly type: PieceType;
  readonly color: PieceColor;
  public file: number;
  public rank: number;
  public modelRoot: Object3D;
  //   public mesh: Mesh;
  public meshes: Object3D[] = [];

  public constructor(
    type: PieceType,
    color: PieceColor,
    file: number,
    rank: number,
    modelRoot: Object3D
  ) {
    super();
    this.type = type;
    this.color = color;
    this.file = file;
    this.rank = rank;
    this.name = `piece_${type}_${color}`;
    this.modelRoot = modelRoot;
    this.add(this.modelRoot);

    this.meshes.length = 0;
    this.modelRoot.traverse((o) => {
      //   if (o as Mesh).isMesh {
      //     const mat = o.material as MeshStandardMaterial;
      //     o.material = mat.clone();
      //     o.castShadow = true;
      //     o.receiveShadow = true;
      if (o.type === "Group") {
        o.traverse((c) => {
          if (c.type === "Mesh") {
            this.meshes.push(c);
          }
        });
      } else {
        this.meshes.push(o);
      }
      //   this.meshes.push(o);
      //   }
    });
  }

  public moveTo(
    toSquare: string,
    boardRoot: Object3D,
    duration = 0.4
  ): Promise<void> {
    const { file, rank } = fromAlgebraic(toSquare);

    const startWorld = this.getWorldPosition(new Vector3());
    const endWorld = getSquareWorldPosition(boardRoot, file, rank);

    // const start = this.position.clone();

    // const endWorld = getSquareWorldPosition(file, rank);
    // console.log("endWorld", endWorld);

    // const end = new Vector3(endWorld.x, start.y, endWorld.z);

    const startTime = performance.now();
    const ease = (t: number) => t * t * (3 - 2 * t);

    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / (duration * 1000));
        const k = ease(t);

        const posW = startWorld.clone().lerp(endWorld, k);
        const baseY = MathUtils.lerp(startWorld.y, endWorld.y, k);
        const arc = 0.01;
        posW.y = baseY + arc * (1 - (2 * k - 1) ** 2);

        // const pos = start.clone().lerp(end, k);
        // const arc = 0.01;
        // pos.y = start.y + arc * (1 - (2 * k - 1) ** 2);
        const parent = this.parent as Object3D | null;
        const posLocal = parent ? parent.worldToLocal(posW.clone()) : posW;

        this.position.copy(posLocal);
        // this.position.copy(pos);
        this.updateMatrixWorld();

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
