import { WebGLRenderer, PerspectiveCamera, Vector2 } from "three";
import { Clock, Loop, Viewport, type Lifecycle } from "~/core";
import type { GUI } from "~/GUI";
import { Composer } from "~/Composer";
import { Controls } from "~/Controls";
import { ChessScene } from "~/scenes/ChessScene";
import { Chess } from "chess.js";
import { fromAlgebraic } from "~/utils/utils";

export interface AppParameters {
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  debug?: boolean;
}

export class App implements Lifecycle {
  public debug: boolean;
  public renderer: WebGLRenderer;
  public composer: Composer;
  public camera: PerspectiveCamera;
  public controls: Controls;
  public loop: Loop;
  public clock: Clock;
  public viewport: Viewport;
  public scene: ChessScene;
  public gui?: GUI;
  private pointerNdc: Vector2 = new Vector2();
  private pointerMoveBound = false;
  private chess = new Chess(
    "3r1k1r/4R1Rp/p2P4/1p1n2P1/3N4/8/PPP5/2K5 w - - 0 1"
  );
  private selectedSquare: string | null = null;

  private onPointerMove = (ev: PointerEvent): void => {
    const el = this.renderer.domElement as HTMLCanvasElement;
    const rect = el.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    this.pointerNdc.set(x, y);
    this.scene.pickAt(this.pointerNdc, this.camera);
  };

  private onClick = (ev: PointerEvent): void => {
    const el = this.renderer.domElement as HTMLCanvasElement;
    const rect = el.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    this.pointerNdc.set(x, y);

    const hit = this.scene.pickAt(this.pointerNdc, this.camera);
    if (!hit) return;

    const toAlg = hit.algebraic;

    if (!this.selectedSquare) {
      const piece = this.scene.getPieceAt(hit.file, hit.rank);
      if (!piece) return;

      const turn = this.chess.turn() === "w" ? "white" : "black";
      if (piece.color !== turn) return;

      this.selectedSquare = toAlg;
      return;
    }

    const fromAlg = this.selectedSquare;
    this.selectedSquare = null;

    const move = this.chess.move({ from: fromAlg, to: toAlg, promotion: "q" });
    if (!move) return;

    const { file: fromFile, rank: fromRank } = fromAlgebraic(fromAlg);

    const id = this.scene.boardState[fromRank][fromFile];
    if (!id) return;

    this.scene.animateMove(id, hit.file, hit.rank);
    if (this.chess.isCheckmate()) {
      this.scene.triggerCheckmateEffect();
    } else {
      const endText = document.querySelector(".endText") as HTMLElement;
      endText.innerText = "Game Over";
      endText.style.opacity = "1.0";
    }
  };

  public constructor({ canvas, debug = false }: AppParameters = {}) {
    this.debug = debug;
    this.clock = new Clock();
    this.camera = new PerspectiveCamera(30, 1, 0.1, 50);

    this.renderer = new WebGLRenderer({
      canvas,
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: true,
    });

    this.viewport = new Viewport({
      maximumDpr: 2,
      element: this.renderer.domElement,
      resize: this.resize,
    });

    this.scene = new ChessScene({
      viewport: this.viewport,
      camera: this.camera,
      clock: this.clock,
    });

    this.composer = new Composer({
      renderer: this.renderer,
      viewport: this.viewport,
      clock: this.clock,
      scene: this.scene,
      camera: this.camera,
    });

    this.controls = new Controls({
      camera: this.camera,
      element: this.renderer.domElement,
      clock: this.clock,
    });

    this.loop = new Loop({
      tick: this.tick,
    });
  }

  /**
   * Load the app with its components and assets
   */
  public async load(): Promise<void> {
    await Promise.all([this.composer.load(), this.scene.load()]);
    this.composer.OutlineEffect!.selection.set(this.scene.toOutline);

    if (this.debug) {
      this.gui = new (await import("./GUI")).GUI(this);
    }
  }

  /**
   * Start the app rendering loop
   */
  public start(): void {
    this.viewport.start();
    this.clock.start();
    this.loop.start();
    this.controls.start();
    this.gui?.start();
  }

  /**
   * Stop the app rendering loop
   */
  public stop(): void {
    this.controls.stop();
    this.viewport.stop();
    this.loop.stop();
    if (this.controls.currentPos === this.controls.gamePos) {
      this.renderer.domElement.removeEventListener(
        "pointermove",
        this.onPointerMove
      );
    }
  }

  /**
   * Update the app state, called each loop tick
   */
  public update(): void {
    this.clock.update();
    this.controls.update();
    this.viewport.update();
    this.scene.update();
    this.composer.update();
    // console.log(this.controls.isAtGameView());

    if (this.controls.isAtGameView() && !this.pointerMoveBound) {
      this.renderer.domElement.addEventListener(
        "pointermove",
        this.onPointerMove
      );
      this.pointerMoveBound = true;
    } else if (!this.controls.isAtGameView() && this.pointerMoveBound) {
      this.renderer.domElement.removeEventListener(
        "pointermove",
        this.onPointerMove
      );
      this.pointerMoveBound = false;
    }
    if (this.controls.isAtGameView()) {
      this.renderer.domElement.addEventListener("click", this.onClick);
    } else {
      this.renderer.domElement.removeEventListener("click", this.onClick);
    }
  }

  /**
   * Render the app with its current state, called each loop tick
   */
  public render(): void {
    this.composer.render();
  }

  /**
   * Stop the app and dispose of used resourcess
   */
  public dispose(): void {
    this.controls.dispose();
    this.viewport.dispose();
    this.loop.dispose();
    this.scene.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.gui?.dispose();
  }

  /**
   * Tick handler called by the loop
   */
  public tick = (): void => {
    this.update();
    this.render();
  };

  /**
   * Resize handler called by the viewport
   */
  public resize = (): void => {
    this.composer.resize();
    this.scene.resize();
  };

  /**
   * Create, load and start an app instance with the given parameters
   */
  public static async mount(parameters: AppParameters): Promise<App> {
    const app = new this(parameters);
    await app.load();
    app.start();

    return app;
  }
}
