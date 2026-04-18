// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    server: {
      allowedHosts: ['.monkeycode-ai.online']
    }
  },
  app: {
    head: {
      title: '修仙欠费中',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/xiuxian.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'preload',
          as: 'style',
          href: 'https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&family=IBM+Plex+Mono:wght@300;400;600&display=swap'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&family=IBM+Plex+Mono:wght@300;400;600&display=swap'
        }
      ],
      style: [
        {
          children: `
:root{
  --bg-primary: #000000;
  --bg-secondary: #121212;
  --bg-tertiary: #0A0E27;
  --bg-card: rgba(255,255,255,0.04);
  --bg0: #07080c;
  --bg1: #0b0f16;
  --neon-green: #00FF00;
  --neon-magenta: #FF00FF;
  --neon-cyan: #00FFFF;
  --neon-blue: #0080FF;
  --neon-pink: #FF006E;
  --aqua: #38f8d0;
  --primary: #1E40AF;
  --secondary: #3B82F6;
  --danger: #FF3B3B;
  --warning: #FFD24A;
  --success: #44FF9A;
  --ok: #44ff9a;
  --warn: #ffd24a;
  --text-primary: #E8ECF6;
  --text-secondary: #9AA6C6;
  --text-muted: #6B7280;
  --text-danger: #FF3B3B;
  --text: #e8ecf6;
  --muted: #9aa6c6;
  --border-default: rgba(255,255,255,0.10);
  --overlay: rgba(0,0,0,0.62);
  --line: rgba(255,255,255,.10);
  --border: rgba(255,255,255,.10);
  --glow-cyan: 0 0 10px rgba(0,255,255,0.5);
  --glow-magenta: 0 0 10px rgba(255,0,255,0.5);
  --glow-green: 0 0 10px rgba(0,255,0,0.5);
  --glow-red: 0 0 10px rgba(255,59,59,0.5);
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --serif: "ZCOOL XiaoWei", ui-serif, Georgia, "Times New Roman", serif;
  --bp-sm: 640px;
  --bp-lg: 1024px;
  --font-body: 14px;
  --font-meta: 12px;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 24px;
  --text-3xl: 28px;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --leading-tight: 1.15;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
body{background-color:#000000;color:#e8ecf6;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;margin:0}
`
        }
      ]
    }
  }
})
