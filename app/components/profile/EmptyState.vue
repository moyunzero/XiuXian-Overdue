<template>
  <div class="empty-state">
    <div class="empty-visual">
      <div class="pulse-ring" />
      <div class="pulse-ring delay" />
      <svg viewBox="0 0 120 120" class="archive-icon">
        <rect x="25" y="20" width="70" height="80" rx="4" class="icon-rect" />
        <line x1="35" y1="35" x2="85" y2="35" class="icon-line line1" />
        <line x1="35" y1="47" x2="75" y2="47" class="icon-line line2" />
        <line x1="35" y1="59" x2="80" y2="59" class="icon-line line3" />
        <circle cx="60" cy="82" r="6" class="icon-dot" />
      </svg>
    </div>

    <h3 class="empty-title">档案建立中...</h3>
    <p class="empty-desc">
      系统正在收集你的行为数据
    </p>
    <p class="empty-hint">
      完成首次行动后，系统将生成你的第一份制度档案
    </p>
  </div>
</template>

<style scoped>
.empty-state {
  width: 100%;
  max-width: 1200px;
  background: rgba(18, 18, 18, 0.6);
  border: 1px dashed rgba(0,255,255,0.15);
  border-radius: 8px;
  padding: 4rem 2rem;
  text-align: center;
  position: relative;
}

.empty-visual {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
}

.pulse-ring {
  position: absolute;
  inset: -8px;
  border: 1px solid rgba(0,255,255,0.2);
  border-radius: 50%;
  animation: pulse 2.5s ease-in-out infinite;
}

.pulse-ring.delay {
  animation-delay: 1.25s;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.15); opacity: 0; }
}

.archive-icon {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.icon-rect {
  fill: none;
  stroke: rgba(0,255,255,0.3);
  stroke-width: 1.5;
}

.icon-line {
  stroke: rgba(0,255,255,0.25);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.line1 { animation: fadeInLine 1.5s ease-in-out infinite; }
.line2 { animation: fadeInLine 1.5s ease-in-out 0.3s infinite; }
.line3 { animation: fadeInLine 1.5s ease-in-out 0.6s infinite; }

@keyframes fadeInLine {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.icon-dot {
  fill: #00FFFF;
  opacity: 0.6;
  animation: blinkDot 2s ease-in-out infinite;
}

@keyframes blinkDot {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #E8ECF6;
  margin: 0 0 0.5rem;
  font-family: "IBM Plex Mono", monospace;
}

.empty-desc {
  font-size: 0.875rem;
  color: #9AA6C6;
  margin: 0 0 0.25rem;
}

.empty-hint {
  font-size: 0.75rem;
  color: #6B7280;
  margin: 0;
}
</style>
