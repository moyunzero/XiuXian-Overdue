<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useGame } from '~/composables/useGame'

const { game } = useGame()

const canvas = ref<HTMLCanvasElement | null>(null)
const webglFailed = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let frameId: number | null = null
let modelRoot: THREE.Object3D | null = null
let throttleTimer: ReturnType<typeof setTimeout> | null = null

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const NODE_MAPPINGS: Record<string, string[]> = {
  LeftPalm: ['left-palm'],
  RightPalm: ['right-palm'],
  LeftArm: ['left-arm'],
  RightArm: ['right-arm'],
  LeftLeg: ['left-leg'],
  RightLeg: ['right-leg']
}

const BODY_PART_LABELS: Record<string, string> = {
  LeftPalm: '左手掌',
  RightPalm: '右手掌',
  LeftArm: '左臂',
  RightArm: '右臂',
  LeftLeg: '左腿',
  RightLeg: '右腿'
}

function isWebGLAvailable(): boolean {
  try {
    const testCanvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

function findPartNode(root: THREE.Object3D, partId: string): THREE.Object3D | null {
  const aliases = NODE_MAPPINGS[partId] ?? [partId.toLowerCase()]
  let found: THREE.Object3D | null = null
  root.traverse((obj) => {
    if (found) return
    if (!obj.name) return
    const lower = obj.name.toLowerCase()
    if (aliases.some((alias) => lower.includes(alias))) {
      found = obj
    }
  })
  return found
}

function updateVisibility() {
  if (!modelRoot) return
  const repayment = game.value.bodyPartRepayment ?? {}
  for (const partId of Object.keys(NODE_MAPPINGS)) {
    const node = findPartNode(modelRoot, partId)
    if (!node) {
      console.warn(`[HumanModelViewer] Node not found for part: ${partId}`)
      continue
    }
    const isRepaid = repayment[partId] === true
    node.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.visible = !isRepaid
      }
    })
  }
}

function throttledUpdateVisibility() {
  if (throttleTimer !== null) return
  throttleTimer = setTimeout(() => {
    updateVisibility()
    throttleTimer = null
  }, 100)
}

const repaidPartsList = computed(() => {
  const repayment = game.value.bodyPartRepayment ?? {}
  return Object.entries(repayment)
    .filter(([, v]) => v === true)
    .map(([k]) => BODY_PART_LABELS[k] ?? k)
})

onMounted(() => {
  if (!canvas.value) return

  if (!isWebGLAvailable()) {
    webglFailed.value = true
    return
  }

  const mobile = isMobile()
  const width = canvas.value.clientWidth || 280
  const height = mobile ? 220 : 280

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas.value,
      antialias: !mobile
    })
    renderer.setPixelRatio(mobile ? 1.0 : (window.devicePixelRatio || 1))
    renderer.setSize(width, height)
  } catch {
    webglFailed.value = true
    return
  }

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020308)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0.8, 3.5)
  camera.lookAt(0, 0, 0)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(3, 5, 4)
  scene.add(dirLight)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))

  const loader = new GLTFLoader()
  loader.load(
    '/models/human-body.glb',
    (gltf) => {
      modelRoot = gltf.scene
      modelRoot.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          mesh.castShadow = true
          mesh.receiveShadow = true
        }
      })
      modelRoot.position.set(0, -0.9, 0)
      scene?.add(modelRoot)
      updateVisibility()
    },
    undefined,
    (err) => {
      console.error('[HumanModelViewer] Failed to load model', err)
    }
  )

  const shouldRotate = !mobile && !prefersReducedMotion()

  const animate = () => {
    if (!scene || !camera || !renderer) return
    frameId = requestAnimationFrame(animate)
    if (modelRoot && shouldRotate) {
      modelRoot.rotation.y += 0.003
    }
    renderer.render(scene, camera)
  }

  animate()
})

onBeforeUnmount(() => {
  if (frameId !== null) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
  if (throttleTimer !== null) {
    clearTimeout(throttleTimer)
    throttleTimer = null
  }
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  scene = null
  camera = null
  modelRoot = null
})

watch(
  () => game.value.bodyPartRepayment,
  throttledUpdateVisibility,
  { deep: true }
)
</script>

<template>
  <div class="HumanModelViewer">
    <!-- WebGL fallback -->
    <div v-if="webglFailed" class="FallbackUI">
      <p>您的浏览器不支持3D渲染</p>
      <ul v-if="repaidPartsList.length" role="list" class="RepaidList">
        <li v-for="part in repaidPartsList" :key="part">{{ part }}</li>
      </ul>
      <p v-else>暂无偿还记录</p>
    </div>

    <!-- 3D Canvas -->
    <template v-else>
      <canvas
        ref="canvas"
        class="ModelCanvas"
        aria-label="人体模型 - 显示已偿还的身体部位"
      />
      <!-- Text fallback list for screen readers -->
      <div class="SrOnly" aria-live="polite">
        <ul v-if="repaidPartsList.length" role="list">
          <li v-for="part in repaidPartsList" :key="part">已偿还：{{ part }}</li>
        </ul>
        <span v-else>暂无偿还记录</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.HumanModelViewer {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  background: #020308;
  overflow: hidden;
  position: relative;
}

.ModelCanvas {
  width: 100%;
  height: 280px;
  display: block;
}

.FallbackUI {
  padding: 16px;
  color: var(--muted, #888);
  font-size: 13px;
}

.RepaidList {
  margin: 8px 0 0;
  padding-left: 16px;
}

.SrOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 767px) {
  .ModelCanvas {
    height: 220px;
  }
}
</style>
