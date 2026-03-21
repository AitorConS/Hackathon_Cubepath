'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Escena del Barco Animada ────────────────────────────────────────────────────

function ShipScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let tick = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Colores de contenedores que coinciden con la paleta de CubePod
    const containerColors = [
      '#3b82f6', // blue-500
      '#1d4ed8', // blue-700
      '#2563eb', // blue-600
      '#6366f1', // indigo
      '#0ea5e9', // sky
    ]

    function drawWaves(t: number) {
      const w = canvas!.width
      const h = canvas!.height
      const baseY = h * 0.65

      for (let layer = 0; layer < 3; layer++) {
        const speed = 0.8 + layer * 0.4
        const amp = 6 - layer * 1.5
        const alpha = 0.15 + layer * 0.12
        ctx!.beginPath()
        ctx!.moveTo(0, baseY)
        for (let x = 0; x <= w; x += 4) {
          const y = baseY + Math.sin((x / 120) + t * speed) * amp + Math.sin((x / 60) + t * speed * 1.3) * (amp * 0.4)
          ctx!.lineTo(x, y)
        }
        ctx!.lineTo(w, h)
        ctx!.lineTo(0, h)
        ctx!.closePath()
        ctx!.fillStyle = `rgba(30, 58, 138, ${alpha})`
        ctx!.fill()
      }
    }

    function drawShip(x: number, bobY: number) {
      const w = canvas!.width
      const h = canvas!.height
      const waterLine = h * 0.65

      // Ship scale based on canvas width
      const scale = Math.min(w / 900, 1.4)
      const shipW = 280 * scale
      const hull = waterLine + bobY
      const hullH = 40 * scale

      ctx!.save()
      ctx!.translate(x - shipW / 2, 0)

      // Casco
      ctx!.beginPath()
      ctx!.moveTo(0, hull)
      ctx!.lineTo(shipW * 0.08, hull + hullH)
      ctx!.lineTo(shipW * 0.92, hull + hullH)
      ctx!.lineTo(shipW, hull)
      ctx!.closePath()
      ctx!.fillStyle = '#1e293b'
      ctx!.fill()
      ctx!.strokeStyle = '#334155'
      ctx!.lineWidth = 1.5
      ctx!.stroke()

      // Cubierta
      ctx!.fillStyle = '#0f172a'
      ctx!.fillRect(shipW * 0.05, hull - 8 * scale, shipW * 0.9, 10 * scale)

      // Contenedores — 2 filas, 4 columnas
      const cols = 4
      const rows = 2
      const cW = (shipW * 0.72) / cols
      const cH = 22 * scale
      const startX = shipW * 0.14
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = startX + col * (cW + 2 * scale)
          const cy = hull - 8 * scale - (row + 1) * (cH + 2 * scale)
          const color = containerColors[(row * cols + col) % containerColors.length]
          ctx!.fillStyle = color
          ctx!.fillRect(cx, cy, cW, cH)
          // Resaltado de borde
          ctx!.fillStyle = 'rgba(255,255,255,0.08)'
          ctx!.fillRect(cx, cy, cW, 3 * scale)
          // Nervaduras del contenedor
          ctx!.strokeStyle = 'rgba(0,0,0,0.3)'
          ctx!.lineWidth = 0.8
          for (let r = 1; r < 3; r++) {
            ctx!.beginPath()
            ctx!.moveTo(cx + (cW / 3) * r, cy)
            ctx!.lineTo(cx + (cW / 3) * r, cy + cH)
            ctx!.stroke()
          }
        }
      }

      // Superestructura (puente)
      const bridgeX = shipW * 0.1
      const bridgeW = 42 * scale
      const bridgeH = 50 * scale
      const bridgeY = hull - 8 * scale - bridgeH
      ctx!.fillStyle = '#1e3a5f'
      ctx!.fillRect(bridgeX, bridgeY, bridgeW, bridgeH)
      // Ventanas
      ctx!.fillStyle = '#bae6fd'
      for (let wi = 0; wi < 3; wi++) {
        ctx!.fillRect(bridgeX + 6 * scale + wi * 10 * scale, bridgeY + 8 * scale, 6 * scale, 5 * scale)
        ctx!.fillRect(bridgeX + 6 * scale + wi * 10 * scale, bridgeY + 20 * scale, 6 * scale, 5 * scale)
      }
      // Chimenea
      ctx!.fillStyle = '#1e293b'
      ctx!.fillRect(bridgeX + bridgeW * 0.3, bridgeY - 20 * scale, 12 * scale, 22 * scale)

      // Partículas de humo de la chimenea
      const smokeBaseX = x - shipW / 2 + bridgeX + bridgeW * 0.3 + 6 * scale
      const smokeBaseY = hull - 8 * scale - bridgeH - 20 * scale
      ctx!.restore()

      // Dibujar humo fuera de la traslación del barco
      for (let s = 0; s < 5; s++) {
        const st = (tick * 0.4 + s * 14) % 60
        const sx = smokeBaseX - st * 0.5
        const sy = smokeBaseY - st * 0.7
        const radius = (3 + s) * scale
        const alpha = Math.max(0, 0.25 - st * 0.004)
        ctx!.beginPath()
        ctx!.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(148, 163, 184, ${alpha})`
        ctx!.fill()
      }
    }

    // Pequeños pájaros (decorativos)
    function drawBirds(t: number) {
      const w = canvas!.width
      const h = canvas!.height
      ctx!.strokeStyle = 'rgba(148,163,184,0.4)'
      ctx!.lineWidth = 1.2
      for (let i = 0; i < 5; i++) {
        const bx = ((w * 0.1 + i * w * 0.18 + t * 12 * (0.5 + i * 0.1)) % (w * 1.2)) - w * 0.1
        const by = h * 0.15 + Math.sin(t * 0.8 + i) * h * 0.04 + i * h * 0.025
        const wing = Math.sin(t * 3 + i) * 4
        ctx!.beginPath()
        ctx!.moveTo(bx - 6, by + wing)
        ctx!.quadraticCurveTo(bx, by, bx + 6, by + wing)
        ctx!.stroke()
      }
    }

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      tick += 0.016

      ctx!.clearRect(0, 0, w, h)

      // Estrellas / puntos en el fondo
      ctx!.fillStyle = 'rgba(148,163,184,0.08)'
      for (let i = 0; i < 40; i++) {
        const sx = (i * 173 % w + tick * (i % 3 === 0 ? 0.2 : 0)) % w
        const sy = (i * 97) % (h * 0.55)
        ctx!.beginPath()
        ctx!.arc(sx, sy, 0.8, 0, Math.PI * 2)
        ctx!.fill()
      }

      drawBirds(tick)
      drawWaves(tick)

      // Barco: recorre lentamente de derecha a izquierda
      const speed = w * 0.018
      const shipX = w + 200 - ((tick * speed) % (w + 500))
      const bob = Math.sin(tick * 1.2) * 3
      drawShip(shipX, bob)

      animFrame = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

// ─── Tarjeta de Funcionalidad ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40 hover:bg-gray-900">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-2xl ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/20">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
    </div>
  )
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white overflow-x-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Icono del Logo */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="9" y1="12" x2="15" y2="12" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">CubePod</span>
          </div>
          <Link
            href="/login"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:border-blue-500 hover:text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-0 text-center">
        {/* Brillo sutil */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #3b82f617, transparent)',
          }}
        />

        {/* Etiqueta */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Gestión de contenedores, simplificada
        </div>

        <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Despliega contenedores
          <br />
          <span className="bg-linear-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            en 2 clicks
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-gray-400">
          Lanza, gestiona y expón contenedores Docker desde una interfaz web limpia. Sin necesidad de CLI.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:bg-blue-500 hover:shadow-blue-900/60"
          >
            Empieza gratis
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-gray-700 px-7 py-3 text-sm font-medium text-gray-300 transition-all hover:border-gray-500 hover:text-white"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Escenario de Animación del Barco */}
        <div
          className="relative mt-16 w-full max-w-5xl overflow-hidden rounded-t-3xl border-x border-t border-gray-800/70"
          style={{ height: '280px', background: 'linear-gradient(to bottom, #060b14 0%, #071426 55%, #0c1f3f 100%)' }}
        >
          <ShipScene />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white">Todo lo que necesitas</h2>
          <p className="mt-3 text-gray-400">Desde el despliegue hasta una URL pública en segundos.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="🚀"
            title="Despliegue Rápido"
            desc="Lanza nuevos pods en segundos. Sin comandos complejos, solo un clic y ya está."
          />
          <FeatureCard
            icon="🛠️"
            title="Gestión Total"
            desc="Controla tus contenedores. Inicia, detén y elimina pods desde tu panel de control."
          />
          <FeatureCard
            icon="🖥️"
            title="Terminal Integrada"
            desc="Acceso directo a la consola de tus contenedores. Todo desde el navegador."
          />
          <FeatureCard
            icon="📁"
            title="Explorador de Archivos"
            desc="Sube, descarga y edita archivos de tus contenedores de manera sencilla."
          />
          <FeatureCard
            icon="🌐"
            title="Túneles de Red"
            desc="Expone tus puertos a internet con URLs públicas instantáneas y seguras."
          />
          <FeatureCard
            icon="🔒"
            title="Seguro y Escalable"
            desc="Autenticación integrada con Supabase y aislamiento total de contenedores."
          />
        </div>
      </section>

      {/* ── Banner de CTA ── */}
      <section className="border-t border-gray-800/80 bg-gray-950 px-6 py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-6">¿Listo para empezar?</h2>
        <p className="mx-auto max-w-lg text-gray-400 mb-10">
          Únete a CubePod hoy y experimenta la forma más rápida de gestionar tus contenedores Docker.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-gray-950 transition-all hover:bg-gray-200"
        >
          Empieza ahora
        </Link>
      </section>

      {/* ── Pie de página ── */}
      <footer className="border-t border-gray-900 bg-gray-950 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <span className="text-sm text-gray-500">
            © {new Date().getFullYear()} CubePod. Ningún derechos reservado.
          </span>
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-blue-400 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
