import { WebGLRenderer, PerspectiveCamera, Vector2 } from "three";
import { Clock, Loop, Viewport, type Lifecycle } from "~/core";
import type { GUI } from "~/GUI";
import { Composer } from "~/Composer";
import { Controls } from "~/Controls";
import { ChessScene } from "~/scenes/newChessScene";
import { Chess } from "chess.js";
import { toAlgebraic, fromAlgebraic, fileOf, rankOf } from "~/utils/utils";
import type { Square } from "chess.js";

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
  private chess = new Chess();

  private state: "idle" | "selecting" | "animating" | "promoting" = "idle";
  private selectedSquare: Square | null = null;
  private legalTargets = new Map<Square, ReturnType<Chess["moves"]>>();
  private onClickBound = (ev: PointerEvent) => void this.onClick(ev);
  private clickListenerAttached = false;

  private currentTurnColor(): "white" | "black" {
    return this.chess.turn() === "w" ? "white" : "black";
  }
  private pieceAt(square: Square) {
    const { file, rank } = fromAlgebraic(square);
    return this.scene.board.boardState[rank][file];
  }
  private legalFor(square: Square) {
    return this.chess.moves({ square, verbose: true }) as any[];
  }
  private pickSquareFromEvent = (ev: PointerEvent): Square | null => {
    const el = this.renderer.domElement as HTMLCanvasElement;
    const rect = el.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    this.pointerNdc.set(x, y);
    const hit = this.scene.board.pickAt(this.pointerNdc, this.camera);
    return hit?.algebraic ?? null;
  };
  private selectSquare(square: Square) {
    this.selectedSquare = square;
    const moves = this.legalFor(square);
    this.legalTargets.set(square, moves);
  }
  private clearSelection() {
    this.selectedSquare = null;
    this.legalTargets.clear();
  }

  private async applyMoveEffects(move: any) {
    const fromAlg = move.from as Square;
    const toAlg = move.to as Square;
    const flags = move.flags as string;

    // EN PASSANT : la capture n'est pas sur "to"
    if (flags.includes("e")) {
      const { file: toF, rank: toR } = fromAlgebraic(toAlg);
      const moverColor: "w" | "b" = move.color;
      const capR = moverColor === "w" ? toR - 1 : toR + 1;
      const capAlg = toAlgebraic(toF, capR);
      this.scene.board.removeAt(capAlg);
    }

    // ROQUE : bouger la tour
    if (flags.includes("k") || flags.includes("q")) {
      const { rank: kingRank } = fromAlgebraic(toAlg);
      const isKingSide = flags.includes("k");
      const rookFromFile = isKingSide ? 7 : 0;
      const rookToFile = isKingSide ? 5 : 3;
      const rookFrom = toAlgebraic(rookFromFile, kingRank);
      const rookTo = toAlgebraic(rookToFile, kingRank);
      await this.scene.board.move(rookFrom, rookTo);
    }

    // PROMOTION visuelle (chess.js a déjà promu côté logique)
    if (flags.includes("p")) {
      // move.promotion: 'q'|'r'|'b'|'n'
      // Si tu veux remplacer le mesh du pion par la nouvelle pièce :
      // this.scene.board.replacePieceAt(toAlg, move.promotion)
      // (implé à faire : remove + add nouveau Piece conservant color)
    }
  }
  private async afterMoveChecks() {
    if (this.chess.isCheckmate()) {
      // show "Checkmate!"
    } else if (this.chess.inCheck()) {
      // show "Check!"
    } else if (this.chess.isDraw()) {
      // show "Draw"
    }
    const turn = this.currentTurnColor();
    (
      document.querySelector(".turn") as HTMLElement
    ).innerText = `It's ${turn}'s turn`;
  }

  private async onClick(ev: PointerEvent): Promise<void> {
    if (this.state === "animating" || this.state === "promoting") return;

    const clicked = this.pickSquareFromEvent(ev);
    if (!clicked) {
      this.clearSelection();
      return;
    }

    if (!this.selectedSquare) {
      const piece = this.pieceAt(clicked);
      if (!piece || piece.color !== this.currentTurnColor()) {
        this.clearSelection();
        return;
      }
      this.selectSquare(clicked);
      return;
    }

    if (clicked === this.selectedSquare) {
      this.clearSelection();
      return;
    }

    const target = this.pieceAt(clicked);
    if (target && target.color === this.currentTurnColor()) {
      this.selectSquare(clicked);
      return;
    }

    const fromAlg = this.selectedSquare;
    const legal = (
      this.legalTargets.get(fromAlg) ?? this.legalFor(fromAlg)
    ).find((m: any) => m.to === clicked);

    if (!legal) {
      // this.scene.board.illegalMove(clicked);
      return;
    }

    let promotion = legal.promotion as "q" | "r" | "b" | "n" | undefined;
    if (legal.flags.includes("p") && !promotion) {
      promotion = "q";
    }

    const move = this.chess.move({ from: fromAlg, to: clicked, promotion });
    if (!move) return;

    this.state = "animating";
    this.clearSelection();

    await this.scene.board.move(fromAlg, clicked);

    await this.applyMoveEffects(move);

    this.state = "idle";
    await this.afterMoveChecks();
  }

  private onPointerMove = (ev: PointerEvent): void => {
    this.pickSquareFromEvent(ev);
    const cell = this.scene.board.highlightedIndex;
    if (cell !== null) {
      const file = fileOf(cell);
      const rank = rankOf(cell);
      const cellText = document.querySelector(".cell") as HTMLElement;
      const cellToAlg = toAlgebraic(file, rank);
      cellText.innerText = `${cellToAlg}`;
      const pieceText = document.querySelector(".piece") as HTMLElement;
      const piece = this.scene.board.boardState[rank][file];
      if (piece) {
        pieceText.innerText = `${piece.name}`;
      }
    }
  };

  // private onClick = (ev: PointerEvent): void => {
  //   const el = this.renderer.domElement as HTMLCanvasElement;
  //   const rect = el.getBoundingClientRect();
  //   const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  //   const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
  //   this.pointerNdc.set(x, y);

  //   const hit = this.scene.board.pickAt(this.pointerNdc, this.camera);
  //   if (!hit) return;

  //   const toAlg = hit.algebraic;

  //   if (!this.selectedSquare) {
  //     const piece = this.scene.board.boardState[hit.rank][hit.file];
  //     if (!piece) return;

  //     const turn = this.chess.turn() === "w" ? "white" : "black";
  //     if (piece.color !== turn) return;

  //     this.selectedSquare = toAlg;
  //     return;
  //   }

  //   const fromAlg = this.selectedSquare;
  //   this.selectedSquare = null;

  //   const { file: fromFile, rank: fromRank } = fromAlgebraic(fromAlg);

  //   const move = this.chess.move({ from: fromAlg, to: toAlg, promotion: "q" });
  //   if (!move) return;

  //   const id = this.scene.board.boardState[fromRank][fromFile];
  //   if (!id) return;

  //   this.scene.board.move(fromAlg, toAlg);
  //   if (move.isKingsideCastle()) {
  //     this.scene.board.move();
  //   }
  //   if (move.isQueensideCastle()) {
  //   }
  //   if (move.isPromotion()) {
  //   }
  //   if (move.isEnPassant()) {
  //   }
  //   if (move.isCapture()) {
  //   }

  //   if (this.chess.isCheckmate()) {
  //   }
  //   if (this.chess.inCheck()) {
  //   }
  //   if (this.chess.isDraw()) {
  //   }
  // };

  public constructor({ canvas, debug = false }: AppParameters = {}) {
    this.debug = debug;
    this.clock = new Clock();
    this.camera = new PerspectiveCamera(30, 1, 0.1, 50);
    this.renderer = new WebGLRenderer({
      canvas,
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: false,
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
      chess: this.chess,
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
    // console.log("scene", this.scene);
    const toOutline = [];
    this.scene.board.traverse((child) => {
      if (child.name.startsWith("piece_")) {
        if (child.type === "Group") {
          child.traverse((c) => {
            if (c.type === "Mesh") {
              toOutline.push(c);
            }
          });
        } else {
          toOutline.push(child);
        }
      }
    });
    // this.composer.OutlineEffect!.selection.set(this.scene.board.outlineTargets);
    // this.composer.OutlineEffect!.selection.set(this.scene.toOutline);
    // console.log("Outline targets", this.scene.board.outlineTargets);
    // console.log("Outline targets", this.scene.toOutline);
    // console.log("selection", this.composer.OutlineEffect!.selection);
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
    // if (this.controls.currentPos === this.controls.gamePos) {
    //   this.renderer.domElement.removeEventListener(
    //     "pointermove",
    //     this.onPointerMove
    //   );
    // }
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

    const turn = this.chess.turn() === "w" ? "white" : "black";
    const turnText = document.querySelector(".turn") as HTMLElement;
    turnText.innerText = `It's ${turn}'s turn`;

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
    if (this.controls.isAtGameView() && !this.clickListenerAttached) {
      this.renderer.domElement.addEventListener("click", this.onClickBound);
      this.clickListenerAttached = true;
    } else if (!this.controls.isAtGameView() && this.clickListenerAttached) {
      this.renderer.domElement.removeEventListener("click", this.onClickBound);
      this.clickListenerAttached = false;
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
