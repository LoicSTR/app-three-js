import { Scene, PerspectiveCamera, AmbientLight } from "three";
import type { Viewport, Clock, Lifecycle } from "~/core";
import { Board } from "~/objects/Board";
import { Piece } from "~/objects/Piece";

export interface MainSceneParamaters {
  clock: Clock;
  camera: PerspectiveCamera;
  viewport: Viewport;
}

export class ChessScene extends Scene implements Lifecycle {
  public clock: Clock;
  public camera: PerspectiveCamera;
  public viewport: Viewport;
  public board: Board;
  public ambiantLight: AmbientLight;

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    this.board = new Board();
    this.add(this.board);

    this.ambiantLight = new AmbientLight(0xffffff, 0.5);
    this.add(this.ambiantLight);
  }

  public load(): Promise<void> {
    this.board.load();
    return Promise.resolve();
  }

  public update(): void {
    this.board.update();
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    this.board.dispose();
  }
}
