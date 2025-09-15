import {
  Scene,
  Mesh,
  TorusKnotGeometry,
  MeshStandardMaterial,
  PointLight,
  PerspectiveCamera
} from 'three'

import type {
  Viewport,
  Clock,
  Lifecycle
} from '~/core'

export interface MainSceneParamaters {
  clock: Clock
  camera: PerspectiveCamera
  viewport: Viewport
}

export class ExampleScene extends Scene implements Lifecycle {
  public clock: Clock
  public camera: PerspectiveCamera
  public viewport: Viewport
  public torusKnot: Mesh<TorusKnotGeometry, MeshStandardMaterial>
  public light1: PointLight
  public light2: PointLight
  public light3: PointLight

  public constructor({
    clock,
    camera,
    viewport
  }: MainSceneParamaters) {
    super()

    this.clock = clock
    this.camera = camera
    this.viewport = viewport

    this.torusKnot = new Mesh(
      new TorusKnotGeometry(1, 0.4, 200, 40, 2, 1),
      new MeshStandardMaterial({
        metalness: 1,
        roughness: 0.4
      })
    )

    this.light1 = new PointLight(0xffbbff, 0.5, 30, 0.5)
    this.light1.position.set(2, 0, -2)

    this.light2 = new PointLight(0xbbffff, 0.5, 30, 0.5)
    this.light2.position.set(-2, 4, 2)

    this.light3 = new PointLight(0xffffff, 1, 30, 2)
    this.light3.position.set(0, 5, 0)

    this.add(
      this.torusKnot,
      this.light1,
      this.light2,
      this.light3
    )
  }

  public async load(): Promise<void> {

  }

  public update(): void {
    const theta = Math.atan2(this.camera.position.x, this.camera.position.z)

    this.light1.position.x = Math.cos(theta + this.clock.elapsed * 0.001) * 2
    this.light1.position.z = Math.sin(theta + this.clock.elapsed * 0.0005) * 2
    this.light2.position.y = Math.sin(theta + this.clock.elapsed * 0.001) * 4
    this.light2.position.z = Math.cos(theta + this.clock.elapsed * 0.0005) * 2

    this.torusKnot.rotation.x += 0.0002 * this.clock.delta
    this.torusKnot.rotation.y += 0.0002 * this.clock.delta
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio
    this.camera.updateProjectionMatrix()
  }

  public dispose(): void {
    this.torusKnot.geometry.dispose()
    this.torusKnot.material.dispose()
  }
}
