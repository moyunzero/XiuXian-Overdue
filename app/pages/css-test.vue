<template>
  <div class="AppShell">
    <div class="Container">
      <h1 class="Title">CSS 变量系统测试</h1>
      <p class="Sub">验证所有设计令牌是否正确实现</p>

      <!-- 配色方案测试 -->
      <div class="Card" style="margin-top: 24px;">
        <div class="CardInner">
          <h2 style="font-size: var(--text-xl); margin: 0 0 16px 0;">配色方案</h2>
          
          <h3 style="font-size: var(--text-base); margin: 16px 0 8px 0; color: var(--text-secondary);">背景色</h3>
          <div class="Row">
            <div style="width: 80px; height: 80px; background: var(--bg-primary); border: 1px solid var(--border-default); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--bg-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md);"></div>
          </div>

          <h3 style="font-size: var(--text-base); margin: 16px 0 8px 0; color: var(--text-secondary);">霓虹强调色</h3>
          <div class="Row">
            <div style="width: 80px; height: 80px; background: var(--neon-green); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--neon-magenta); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--neon-cyan); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--neon-blue); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--neon-pink); border-radius: var(--radius-md);"></div>
          </div>

          <h3 style="font-size: var(--text-base); margin: 16px 0 8px 0; color: var(--text-secondary);">功能色</h3>
          <div class="Row">
            <div style="width: 80px; height: 80px; background: var(--primary); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--secondary); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--danger); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--warning); border-radius: var(--radius-md);"></div>
            <div style="width: 80px; height: 80px; background: var(--success); border-radius: var(--radius-md);"></div>
          </div>
        </div>
      </div>

      <!-- 字体系统测试 -->
      <div class="Card" style="margin-top: 24px;">
        <div class="CardInner">
          <h2 style="font-size: var(--text-xl); margin: 0 0 16px 0;">字体系统</h2>
          
          <h3 style="font-size: var(--text-base); margin: 16px 0 8px 0; color: var(--text-secondary);">字体大小 (7级)</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: var(--text-xs);">xs: 11px - 最小文本</div>
            <div style="font-size: var(--text-sm);">sm: 12px - 小号文本</div>
            <div style="font-size: var(--text-base);">base: 14px - 基础文本</div>
            <div style="font-size: var(--text-lg);">lg: 16px - 大号文本</div>
            <div style="font-size: var(--text-xl);">xl: 18px - 超大文本</div>
            <div style="font-size: var(--text-2xl);">2xl: 24px - 标题</div>
            <div style="font-size: var(--text-3xl);">3xl: 28px - 大标题</div>
          </div>

          <h3 style="font-size: var(--text-base); margin: 16px 0 8px 0; color: var(--text-secondary);">字重 (4级)</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-weight: var(--font-normal);">normal: 400 - 常规</div>
            <div style="font-weight: var(--font-medium);">medium: 500 - 中等</div>
            <div style="font-weight: var(--font-semibold);">semibold: 600 - 半粗</div>
            <div style="font-weight: var(--font-bold);">bold: 700 - 粗体</div>
          </div>
        </div>
      </div>

      <!-- 间距系统测试 -->
      <div class="Card" style="margin-top: 24px;">
        <div class="CardInner">
          <h2 style="font-size: var(--text-xl); margin: 0 0 16px 0;">间距系统 (基于4px)</h2>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="width: 100px;">spacing-1 (4px):</span>
              <div style="width: var(--spacing-1); height: 20px; background: var(--neon-cyan);"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="width: 100px;">spacing-2 (8px):</span>
              <div style="width: var(--spacing-2); height: 20px; background: var(--neon-cyan);"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="width: 100px;">spacing-3 (12px):</span>
              <div style="width: var(--spacing-3); height: 20px; background: var(--neon-cyan);"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="width: 100px;">spacing-4 (16px):</span>
              <div style="width: var(--spacing-4); height: 20px; background: var(--neon-cyan);"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="width: 100px;">spacing-6 (24px):</span>
              <div style="width: var(--spacing-6); height: 20px; background: var(--neon-cyan);"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="width: 100px;">spacing-8 (32px):</span>
              <div style="width: var(--spacing-8); height: 20px; background: var(--neon-cyan);"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 霓虹发光效果测试 -->
      <div class="Card" style="margin-top: 24px;">
        <div class="CardInner">
          <h2 style="font-size: var(--text-xl); margin: 0 0 16px 0;">霓虹发光效果</h2>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="neon-glow-cyan" style="font-size: var(--text-2xl); color: var(--neon-cyan);">青色发光文本</div>
            <div class="neon-glow-magenta" style="font-size: var(--text-2xl); color: var(--neon-magenta);">品红发光文本</div>
            <div class="neon-glow-green" style="font-size: var(--text-2xl); color: var(--neon-green);">绿色发光文本</div>
            <div class="neon-glow-red" style="font-size: var(--text-2xl); color: var(--danger);">红色发光文本</div>
          </div>
        </div>
      </div>

      <!-- 分班视觉效果测试 -->
      <div class="Card" style="margin-top: 24px;">
        <div class="CardInner">
          <h2 style="font-size: var(--text-xl); margin: 0 0 16px 0;">分班视觉区分</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="class-elite" style="padding: 16px; border-radius: var(--radius-md); border: 1px solid;">
              示范班 - 青色边框 + 青色发光
            </div>
            <div class="class-normal" style="padding: 16px; border-radius: var(--radius-md); border: 1px solid;">
              普通班 - 灰色边框
            </div>
            <div class="class-bottom" style="padding: 16px; border-radius: var(--radius-md); border: 1px solid;">
              末位班 - 红色边框 + 红色发光
            </div>
          </div>
        </div>
      </div>

      <!-- 边框和效果测试 -->
      <div class="Card" style="margin-top: 24px;">
        <div class="CardInner">
          <h2 style="font-size: var(--text-xl); margin: 0 0 16px 0;">边框和效果</h2>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="border-glow-cyan" style="padding: 16px; border-radius: var(--radius-md); border: 1px solid;">
              青色边框发光
            </div>
            <div class="border-glow-magenta" style="padding: 16px; border-radius: var(--radius-md); border: 1px solid;">
              品红边框发光
            </div>
            <div class="border-glow-green" style="padding: 16px; border-radius: var(--radius-md); border: 1px solid;">
              绿色边框发光
            </div>
            <div class="border-glow-red" style="padding: 16px; border-radius: var(--radius-md); border: 1px solid;">
              红色边框发光
            </div>
          </div>
        </div>
      </div>

      <!-- 玻璃态效果测试 -->
      <div style="margin-top: 24px; position: relative; padding: 40px; background: linear-gradient(135deg, rgba(56,248,208,0.3), rgba(124,92,255,0.3)); border-radius: var(--radius-lg);">
        <div class="glass-effect" style="padding: 24px; border-radius: var(--radius-md);">
          <h2 style="font-size: var(--text-xl); margin: 0 0 8px 0;">玻璃态效果</h2>
          <p style="margin: 0; color: var(--text-secondary);">半透明背景 + 背景模糊 (backdrop-filter: blur(10px))</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// CSS 变量系统测试页面
</script>
