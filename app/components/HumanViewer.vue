<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const canvas = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let frameId: number | null = null
let modelRoot: THREE.Object3D | null = null

const parts = ref<
  {
    id: string
    label: string
    visible: boolean
  }[]
>([
  { id: 'Head', label: '头部', visible: true },
  { id: 'LeftArm', label: '左臂', visible: true },
  { id: 'RightArm', label: '右臂', visible: true },
  { id: 'LeftLeg', label: '左腿', visible: true },
  { id: 'RightLeg', label: '右腿', visible: true }
])

function findPart(root: THREE.Object3D | null, id: string) {
  if (!root) return null
  const lower = id.toLowerCase()
  let found: THREE.Object3D | null = null
  root.traverse((obj) => {
    if (found) return
    if (!obj.name) return
    if (obj.name.toLowerCase().includes(lower)) {
      found = obj
    }
  })
  return found
}

function applyVisibility() {
  if (!modelRoot) return
  for (const p of parts.value) {
    const target = findPart(modelRoot, p.id)
    if (target) {
      target.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.visible = p.visible
        }
      })
    }
  }
}

onMounted(() => {
  if (!canvas.value) return

  const width = canvas.value.clientWidth || 480
  const height = canvas.value.clientHeight || 480

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true
  })
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(width, height)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05070b)

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100)
  camera.position.set(0, 1.6, 4)

  const light = new THREE.DirectionalLight(0xffffff, 1.2)
  light.position.set(3, 5, 4)
  scene.add(light)

  scene.add(new THREE.AmbientLight(0xffffff, 0.4))

  const loader = new GLTFLoader()
  loader.load(
    '/models/human-body.glb',
    (gltf) => {
      modelRoot = gltf.scene

      // 调试：打印所有节点名，方便后续按部位精细控制
      // 在浏览器控制台里查看输出
      // eslint-disable-next-line no-console
      console.groupCollapsed('human-body.glb nodes')
      modelRoot.traverse((obj) => {
        if (obj.name) {
          // eslint-disable-next-line no-console
          console.log(obj.name)
        }
      })
      // eslint-disable-next-line no-console
      console.groupEnd()

      modelRoot.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          mesh.castShadow = true
          mesh.receiveShadow = true
        }
      })
      modelRoot.position.set(0, -1.3, 0)
      scene?.add(modelRoot)
      applyVisibility()
    },
    undefined,
    (err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to load human model', err)
    }
  )

  const animate = () => {
    if (!scene || !camera || !renderer) return
    frameId = requestAnimationFrame(animate)

    if (modelRoot) {
      modelRoot.rotation.y += 0.003
    }

    renderer.render(scene, camera)
  }

  animate()
})

onBeforeUnmount(() => {
  if (frameId !== null) cancelAnimationFrame(frameId)
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  scene = null
  camera = null
  modelRoot = null
})
</script>

<template>
  <div class="Card">
    <div class="CardInner">
      <div class="Row">
        <span class="Pill">人体示意（实验）</span>
        <span class="Spacer" />
        <span class="Pill">模型：Human Dude Guy.glb</span>
      </div>
      <div class="Grid2" style="margin-top: 10px; align-items: stretch">
        <div style="border-radius: 16px; border: 1px solid rgba(255,255,255,.16); overflow: hidden; background: #020308;">
          <canvas ref="canvas" style="width: 100%; height: 340px; display: block" />
        </div>
        <div class="MonoSmall">
          <div class="Label">可隐藏的部位（实验版，需根据模型节点名进一步细化）</div>
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px">
            <label
              v-for="p in parts"
              :key="p.id"
              style="display:flex;align-items:center;gap:8px;cursor:pointer;"
            >
              <input
                v-model="p.visible"
                type="checkbox"
                @change="applyVisibility()"
              >
              <span class="Pill">{{ p.label }}</span>
              <span class="MonoSmall">id: {{ p.id }}</span>
            </label>
          </div>
          <div style="margin-top: 10px">
            说明：当前只是演示如何加载 `Human Dude Guy.glb` 并按节点名隐藏部分网格。后续可以依据具体骨骼/器官节点，
            把“心脏/肝脏/四肢”等做成精确控制。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

