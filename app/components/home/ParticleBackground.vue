<template>
  <canvas
    ref="canvasRef"
    class="ParticleBackground"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  alpha: number
  decay: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let particles: Particle[] = []
let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0

const COLORS = [
  'rgba(0, 255, 255, ',   // cyan
  'rgba(255, 0, 255, ',  // magenta
  'rgba(168, 85, 247, ', // purple
]

const MAX_PARTICLES = 80
const PARTICLE_SPAWN_RATE = 0.15

function createParticle(): Particle | null {
  if (particles.length >= MAX_PARTICLES) return null

  const edge = Math.floor(Math.random() * 4)
  let x: number, y: number, vx: number, vy: number

  switch (edge) {
    case 0: // top
      x = Math.random() * width
      y = -10
      vx = (Math.random() - 0.5) * 0.5
      vy = Math.random() * 0.8 + 0.2
      break
    case 1: // right
      x = width + 10
      y = Math.random() * height
      vx = -(Math.random() * 0.8 + 0.2)
      vy = (Math.random() - 0.5) * 0.5
      break
    case 2: // bottom
      x = Math.random() * width
      y = height + 10
      vx = (Math.random() - 0.5) * 0.5
      vy = -(Math.random() * 0.8 + 0.2)
      break
    default: // left
      x = -10
      y = Math.random() * height
      vx = Math.random() * 0.8 + 0.2
      vy = (Math.random() - 0.5) * 0.5
  }

  return {
    x,
    y,
    vx,
    vy,
    radius: Math.random() * 2 + 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? 'rgba(0, 255, 255,',
    alpha: Math.random() * 0.5 + 0.3,
    decay: Math.random() * 0.003 + 0.001
  }
}

function update() {
  if (Math.random() < PARTICLE_SPAWN_RATE) {
    const p = createParticle()
    if (p) particles.push(p)
  }

  particles = particles.filter(p => {
    p.x += p.vx
    p.y += p.vy
    p.alpha -= p.decay
    return p.alpha > 0
  })
}

function draw() {
  if (!ctx) return

  ctx.clearRect(0, 0, width, height)

  particles.forEach(p => {
    ctx!.beginPath()
    ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx!.fillStyle = `${p.color}${p.alpha})`
    ctx!.fill()

    ctx!.beginPath()
    ctx!.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2)
    ctx!.fillStyle = `${p.color}${p.alpha * 0.2})`
    ctx!.fill()
  })
}

function animate() {
  update()
  draw()
  animationId = requestAnimationFrame(animate)
}

function resize() {
  if (!canvasRef.value) return

  width = canvasRef.value.offsetWidth
  height = canvasRef.value.offsetHeight
  canvasRef.value.width = width
  canvasRef.value.height = height
}

function checkReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

onMounted(() => {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')

  resize()
  window.addEventListener('resize', resize)

  if (!checkReducedMotion()) {
    animate()
  }
})

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resize)
})
</script>

<style scoped>
.ParticleBackground {
  position: fixed;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .ParticleBackground {
    display: none;
  }
}
</style>
