import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import tsconfigPaths from 'vite-tsconfig-paths'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  assetsInclude: [
    '**/*.gltf',
    '**/*.glb',
    '**/*.obj',
    '**/*.mtl'
  ],
  plugins: [
    tsconfigPaths(),
    glsl({
      compress: process.env.NODE_ENV === 'production',
      root: '/node_modules'
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/three/examples/jsm/libs/draco',
          dest: 'libs'
        },
        {
          src: 'node_modules/three/examples/jsm/libs/basis',
          dest: 'libs'
        }
      ]
    })
  ]
})
