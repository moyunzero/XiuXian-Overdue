<template>
  <section class="HeroSection">
    <div class="HeroSection__bg">
      <div class="HeroSection__gradient" />
      <div class="HeroSection__glow HeroSection__glow--cyan" />
      <div class="HeroSection__glow HeroSection__glow--magenta" />
      <div class="HeroSection__glow HeroSection__glow--purple" />
    </div>
    <div class="HeroSection__content">
      <h1 class="HeroSection__title">
        <span class="HeroSection__title-main">修仙欠费中</span>
        <span class="HeroSection__title-sub">当修仙遇到网贷</span>
      </h1>
      <p class="HeroSection__tagline">
        在这个世界里，<br />
        灵力可以换钱，但债务永远追不上利息。
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({
  name: 'HeroSection'
})
</script>

<style scoped>
.HeroSection {
  position: relative;
  padding: 48px 0 32px;
  text-align: center;
  overflow: hidden;
}

.HeroSection__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.HeroSection__gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 50% at 50% 0%,
    rgba(0, 255, 255, 0.08) 0%,
    transparent 50%
  );
}

.HeroSection__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
  animation: float 8s ease-in-out infinite;
}

.HeroSection__glow--cyan {
  width: 300px;
  height: 300px;
  background: rgba(0, 255, 255, 0.3);
  top: -100px;
  left: 10%;
  animation-delay: 0s;
}

.HeroSection__glow--magenta {
  width: 250px;
  height: 250px;
  background: rgba(255, 0, 255, 0.25);
  top: -50px;
  right: 15%;
  animation-delay: -2s;
}

.HeroSection__glow--purple {
  width: 200px;
  height: 200px;
  background: rgba(168, 85, 247, 0.3);
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  animation-delay: -4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

.HeroSection__content {
  position: relative;
  z-index: 1;
}

.HeroSection__title {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.HeroSection__title-main {
  font-family: var(--serif);
  font-size: clamp(32px, 8vw, 56px);
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(
    135deg,
    var(--neon-cyan) 0%,
    var(--neon-magenta) 50%,
    var(--neon-purple, #A855F7) 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 0 30px rgba(0, 255, 255, 0.3));
}

.HeroSection__title-sub {
  font-family: var(--mono);
  font-size: clamp(14px, 3vw, 18px);
  font-weight: 400;
  color: var(--text-secondary);
  letter-spacing: 4px;
  text-transform: uppercase;
}

.HeroSection__tagline {
  margin: 24px auto 0;
  max-width: 400px;
  font-size: var(--text-base);
  line-height: 1.8;
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .HeroSection__glow {
    animation: none;
  }
}

@media (max-width: 640px) {
  .HeroSection {
    padding: 32px 0 24px;
  }

  .HeroSection__glow--cyan,
  .HeroSection__glow--magenta,
  .HeroSection__glow--purple {
    opacity: 0.25;
  }

  .HeroSection__tagline {
    font-size: var(--text-sm);
  }
}
</style>
