import type { WebGLRenderer, Scene, Camera } from "three";

import {
  EffectComposer,
  OutlineEffect,
  EffectPass,
  RenderPass,
  BlendFunction,
} from "postprocessing";

import type { Clock, Viewport, Lifecycle } from "~/core";

export interface ComposerParameters {
  renderer: WebGLRenderer;
  viewport: Viewport;
  clock: Clock;
  scene: Scene;
  camera: Camera;
}

export class Composer extends EffectComposer implements Lifecycle {
  public clock: Clock;
  public viewport: Viewport;
  public renderPass: RenderPass;
  public effectPass?: EffectPass;
  public OutlineEffect?: OutlineEffect;
  private scene: Scene;
  private cam: Camera;

  // public get camera(): Camera | undefined {
  //   return this.renderPass.mainCamera;
  // }

  public constructor({
    renderer,
    viewport,
    clock,
    scene,
    camera,
  }: ComposerParameters) {
    super(renderer);
    this.clock = clock;
    this.viewport = viewport;
    this.scene = scene;
    this.cam = camera;
    this.renderPass = new RenderPass(this.scene, this.cam);
    this.addPass(this.renderPass);
  }

  public async load(): Promise<void> {
    this.OutlineEffect = new OutlineEffect(this.scene, this.cam, {
      blendFunction: BlendFunction.SCREEN,
      edgeStrength: 3.0,
      pulseSpeed: 0.0,
      visibleEdgeColor: 0xffffff,
      hiddenEdgeColor: 0xc55555,
    });
    this.effectPass = new EffectPass(this.cam, this.OutlineEffect);

    this.addPass(this.effectPass);
  }

  public update(): void {}

  public resize(): void {
    this.getRenderer().setPixelRatio(this.viewport.dpr);
    this.setSize(this.viewport.size.x, this.viewport.size.y, false);
  }

  public render(): void {
    super.render(this.clock.delta / 1000);
  }
}
