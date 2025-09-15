<img align="left" src="https://vite.dev/logo.svg" width="100" height="100">

<h3>
  Three / Vite template
</h3>

[![Use this template](https://gist.githubusercontent.com/juliendargelos/35cfc34447d88883afab621ccaca7021/raw/e10f7581e4218e5b6b68bf300b975940c4c3adc6/github-use-this-template.svg)](https://github.com/new?template_name=three-vite-template&template_owner=juliendargelos)

<h2></h2>

<br>

Template repository for three apps using vite and typescript.
- [x] Base app [structure](#structure) and [lifecycle](#app-lifecycle)
- [x] [3D assets imports and typing](#3d-assets)
- [x] [GLSL imports, typing and preprocessing](#glsl) with [`vite-plugin-glsl`](https://github.com/UstymUkhman/vite-plugin-glsl)
- [x] [DRACO and KTX2 library files included](#draco-and-ktx2) with [`vite-plugin-static-copy`](https://github.com/sapphi-red/vite-plugin-static-copy)
- [x] [Post processing](#post-processing) with [`postprocessing`](https://github.com/pmndrs/postprocessing)
- [x] [Camera controls](#camera-controls) with [`camera-controls`](https://github.com/yomotsu/camera-controls)
- [x] [Custom shader materials](#custom-shader-materials) with [`three-custom-shader-material`](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial)
- [x] [Debug GUI](#debug) with [`tweakpane`](https://github.com/cocopon/tweakpane)
- [x] [Continuous deployment to Github Pages](#deployment)

<br>

## Usage

Install dependencies:

```shell
pnpm install
```

Start the development server:

```shell
pnpm dev
```

Build for production:

```shell
pnpm build
```

<br>

## Structure

```shell
src/
├─ core/          # Non business logic code
├─ geometries/    # Custom geometries
├─ materials/     # Custom materials
├─ objects/       # Custom objects and meshes
├─ scenes/        # Scenes
├─ shaders/       # Shaders
├─ utils/         # Utils
├─ App.ts         # App orchestration and lifecycle
├─ Composer.ts    # Rendering and post processing
├─ Controls.ts    # Camera controls
├─ GUI.ts         # Debug GUI
└─ index.ts       # App instantiation
```

<br>

## Features

### App lifecycle

The app, as well as the components it depends on, may implement several methods
provided by the [`Lifecycle`](src/core/Lifecycle.ts) interface to manage states
and lifecycles in a consistent way:

```ts
export interface Lifecycle {
  /**
   * Load resources and component dependencies
   */
  load?(): Promise<void>

  /**
   * Start or enable component
   */
  start?(): void

  /**
   * Stop or disable component
   */
  stop?(): void

  /**
   * Update component state, called each loop tick
   */
  update?(): void

  /**
   * Resize component, called when the viewport is updated
   */
  resize?(): void

  /**
   * Stop component and release used resourcess
   */
  dispose?(): void
}
```

Calls to these methods must then be made in the appropriate lifecycle methods
from the [`App`](src/App.ts) class or other dependent components.

<br>

### 3D assets

`*.glb`, `*.gltf`, `*.obj`, `*.mtl` asset files can be imported as urls from
typescript. This is also true for
[other common asset extensions](https://github.com/vitejs/vite/blob/39fab6db204ea88ffdb346ee98d8abe0ff5d685f/packages/vite/src/node/constants.ts#L130-L170)
built into vite:

```ts
import modelSrc from '~~/assets/models/model.glb'

console.log(modelSrc) // '/assets/model.1da8fbk.glb'
```

This behaviour is configured in [`vite.config.ts`](vite.config.ts) using the
[`assetsInclude`](https://vite.dev/config/shared-options.html#assetsinclude)
option. The corresponding types are declared in
[`vite-env.d.ts`](src/vite-env.d.ts).


<br>

### GLSL

You can import `*.vert`, `*.frag` and `*.glsl` shaders source files from
typescript and use the `#include` macro in your shaders:

```ts
import { ShaderMaterial } from 'three'
import vertexShader from '~/shaders/material.vert'
import fragmentShader from '~/shaders/material.frag'

const material = new ShaderMaterial({
  vertexShader,
  fragmentShader
})
```

See [`vite-plugin-glsl`](https://github.com/UstymUkhman/vite-plugin-glsl)

<br>

### DRACO and KTX2

Library files needed for `DRACOLoader` an `KTX2Loader` are included in the app
build output, they can be referenced from the `/libs` public path:

```ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import modelSrc from '~~/assets/models/model.glb'

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/libs/draco/')

const ktx2Loader = new KTX2Loader()
ktx2Loader.setTranscoderPath('/libs/basis/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)
gltfLoader.setKTX2Loader(ktx2Loader)

gltfLoader.load(modelSrc, (gltf) => {
  // ...
})
```

Any file or folder that is made available in the build output can be be
configured in [`vite.config.ts`](vite.config.ts).

See [`vite-plugin-static-copy`](https://github.com/sapphi-red/vite-plugin-static-copy)

<br>

### Post processing

Post processing effects are managed by the [`Composer`](src/Composer.ts) class.

See [`postprocessing`](https://github.com/pmndrs/postprocessing)

<br>

### Camera controls

Camera controls and animations are managed by the [`Controls`](src/Controls.ts)
class.

See [`camera-controls`](https://github.com/yomotsu/camera-controls)

<br>

### Custom shader materials

Three materials can be extended with custom shaders using the
[`CustomShaderMaterial`](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial/blob/main/package/src/index.ts)
class.

See [`three-custom-shader-material`](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial)

<br>

### Debugging

The [`App`](src/App.ts) class takes a `debug` parameter that you can
use to implement additional debugging features:

```ts
import { App } from './App'

App
  .mount({ debug: true })
  .then(app => console.log(app.debug)) // true
```

To enable debug mode only in development mode:
```ts
App.mount({ debug: import.meta.env.DEV })
```

When `debug` is set to `true`, the app loads the [`GUI`](src/GUI.ts) class as
a separate chunk where your can setup your debug controls.

See [`tweakpane`](https://github.com/cocopon/tweakpane)

<br>

## Deployment

The app is deployed to GitHub Pages through GitHub Actions.
Select `GitHub Actions` as the source for GitHub Pages in your
[repository settings](../../settings/pages).

To disable deployments to GitHub Pages, remove the
[`deploy.yml`](.github/workflows/deploy.yml) workflow.
