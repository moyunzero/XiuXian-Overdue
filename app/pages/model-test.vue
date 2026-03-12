<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const canvas = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let frameId: number | null = null
let modelRoot: THREE.Object3D | null = null

const modelNodes = ref<Array<{ name: string; visible: boolean; object: THREE.Object3D }>>([])
const autoRotate = ref(false)
const showWireframe = ref(false)
const modelLoaded = ref(false)
const loadingError = ref('')

function collectAllNodes(root: THREE.Object3D) {
  const nodes: Array<{ name: string; visible: boolean; object: THREE.Object3D }> = []
  
  root.traverse((obj) => {
    // 只收集有名字且是 Mesh 或 Group 的节点
    if (obj.name && (obj.type === 'Mesh' || obj.type === 'Group' || obj.type === 'Bone')) {
      nodes.push({
        name: obj.name,
        visible: obj.visible,
        object: obj
      })
    }
  })
  
  return nodes
}

function toggleNodeVisibility(index: number) {
  const node = modelNodes.value[index]
  node.visible = !node.visible
  node.object.visible = node.visible
  
  // 如果是 Group，递归设置所有子节点
  node.object.traverse((child) => {
    child.visible = node.visible
  })
}

function toggleAllNodes(visible: boolean) {
  modelNodes.value.forEach((node) => {
    node.visible = visible
    node.object.visible = visible
    node.object.traverse((child) => {
      child.visible = visible
    })
  })
}

function toggleWireframe() {
  showWireframe.value = !showWireframe.value
  if (!modelRoot) return
  
  modelRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          mat.wireframe = showWireframe.value
        })
      } else {
        mesh.material.wireframe = showWireframe.value
      }
    }
  })
}

onMounted(() => {
  if (!canvas.value) return

  const width = canvas.value.clientWidth || 800
  const height = canvas.value.clientHeight || 600

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true
  })
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(0, 1.5, 3)

  controls = new OrbitControls(camera, canvas.value)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 0.8, 0)
  controls.update()

  // 添加多个光源以更好地展示模型
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
  directionalLight2.position.set(-5, 5, -5)
  scene.add(directionalLight2)

  // 添加网格地面作为参考
  const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
  scene.add(gridHelper)

  const loader = new GLTFLoader()
  loader.load(
    '/models/human-body.glb',
    (gltf) => {
      modelRoot = gltf.scene
      modelLoaded.value = true

      // 收集所有节点
      modelNodes.value = collectAllNodes(modelRoot)

      // 打印节点结构到控制台
      console.group('🔍 human-body.glb 节点结构')
      console.log('总节点数:', modelNodes.value.length)
      modelNodes.value.forEach((node, i) => {
        console.log(`${i + 1}. ${node.name} (${node.object.type})`)
      })
      console.groupEnd()

      // 设置模型材质和阴影
      modelRoot.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          mesh.castShadow = true
          mesh.receiveShadow = true
        }
      })

      scene?.add(modelRoot)
    },
    (progress) => {
      console.log('加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%')
    },
    (err) => {
      console.error('模型加载失败:', err)
      loadingError.value = '模型加载失败: ' + err.message
    }
  )

  const animate = () => {
    if (!scene || !camera || !renderer) return
    frameId = requestAnimationFrame(animate)

    if (controls) {
      controls.update()
    }

    if (modelRoot && autoRotate.value) {
      modelRoot.rotation.y += 0.005
    }

    renderer.render(scene, camera)
  }

  animate()

  // 处理窗口大小变化
  const handleResize = () => {
    if (!canvas.value || !camera || !renderer) return
    const width = canvas.value.clientWidth
    const height = canvas.value.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  window.addEventListener('resize', handleResize)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
  })
})

onBeforeUnmount(() => {
  if (frameId !== null) cancelAnimationFrame(frameId)
  if (controls) controls.dispose()
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  scene = null
  camera = null
  controls = null
  modelRoot = null
})
</script>

<template>
  <div style="min-height: 100vh; background: #0f0f1e; color: #e0e0e0; padding: 20px;">
    <div style="max-width: 1400px; margin: 0 auto;">
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">
          🧬 Human Body Model 测试页面
        </h1>
        <p style="color: #888; font-size: 14px;">
          测试 human-body.glb 模型的节点结构和隐藏功能
        </p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 400px; gap: 20px;">
        <!-- 3D 视图 -->
        <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2a2a3e;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="font-size: 18px; font-weight: 600;">3D 视图</h2>
            <div style="display: flex; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px;">
                <input v-model="autoRotate" type="checkbox">
                自动旋转
              </label>
              <button
                style="padding: 6px 12px; background: #2a2a3e; border: 1px solid #3a3a4e; border-radius: 6px; color: #e0e0e0; cursor: pointer; font-size: 14px;"
                @click="toggleWireframe"
              >
                {{ showWireframe ? '实体模式' : '线框模式' }}
              </button>
            </div>
          </div>

          <div v-if="loadingError" style="padding: 40px; text-align: center; color: #ff6b6b;">
            {{ loadingError }}
          </div>

          <div v-else-if="!modelLoaded" style="padding: 40px; text-align: center; color: #888;">
            加载模型中...
          </div>

          <div style="border-radius: 8px; overflow: hidden; background: #0a0a1a;">
            <canvas
              ref="canvas"
              style="width: 100%; height: 600px; display: block;"
            />
          </div>

          <div style="margin-top: 12px; padding: 12px; background: #0a0a1a; border-radius: 6px; font-size: 13px; color: #888;">
            💡 提示：使用鼠标拖拽旋转视角，滚轮缩放，右键拖拽平移
          </div>
        </div>

        <!-- 控制面板 -->
        <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2a2a3e; max-height: 800px; overflow-y: auto;">
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">
            节点控制面板
          </h2>

          <div v-if="!modelLoaded" style="color: #888; text-align: center; padding: 20px;">
            等待模型加载...
          </div>

          <div v-else>
            <div style="margin-bottom: 16px; padding: 12px; background: #0a0a1a; border-radius: 6px;">
              <div style="font-size: 14px; margin-bottom: 8px;">
                总节点数: <strong style="color: #4ade80;">{{ modelNodes.length }}</strong>
              </div>
              <div style="display: flex; gap: 8px;">
                <button
                  style="flex: 1; padding: 8px; background: #2563eb; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px;"
                  @click="toggleAllNodes(true)"
                >
                  全部显示
                </button>
                <button
                  style="flex: 1; padding: 8px; background: #dc2626; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px;"
                  @click="toggleAllNodes(false)"
                >
                  全部隐藏
                </button>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div
                v-for="(node, index) in modelNodes"
                :key="index"
                style="padding: 10px 12px; background: #0a0a1a; border-radius: 6px; border: 1px solid #2a2a3e; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s;"
                :style="{ opacity: node.visible ? 1 : 0.5, borderColor: node.visible ? '#3a3a4e' : '#2a2a3e' }"
                @click="toggleNodeVisibility(index)"
              >
                <input
                  type="checkbox"
                  :checked="node.visible"
                  style="cursor: pointer;"
                  @click.stop="toggleNodeVisibility(index)"
                >
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 14px; font-weight: 500; color: #e0e0e0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ node.name }}
                  </div>
                  <div style="font-size: 11px; color: #666; margin-top: 2px;">
                    {{ node.object.type }}
                  </div>
                </div>
                <div
                  style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;"
                  :style="{ background: node.visible ? '#065f46' : '#7f1d1d', color: node.visible ? '#34d399' : '#fca5a5' }"
                >
                  {{ node.visible ? '显示' : '隐藏' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
