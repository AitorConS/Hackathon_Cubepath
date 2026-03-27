'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Cpu, MemoryStick, Network } from 'lucide-react'

interface Stats {
  cpu_percent: number
  mem_usage: number
  mem_limit: number
  mem_percent: number
  network_rx: number
  network_tx: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function StatBar({ value, color }: { value: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default function PodStats({ podId }: { podId: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const getToken = async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/pods/${podId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
    }
  }, [apiUrl, podId])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 3000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (!stats) return null

  const cpuColor =
    stats.cpu_percent > 80
      ? 'bg-red-500'
      : stats.cpu_percent > 50
      ? 'bg-yellow-500'
      : 'bg-green-500'

  const memColor =
    stats.mem_percent > 80
      ? 'bg-red-500'
      : stats.mem_percent > 50
      ? 'bg-yellow-500'
      : 'bg-blue-500'

  return (
    <div className="px-4 py-3 border-b border-gray-800 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Métricas</p>

      {/* CPU */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Cpu className="w-3 h-3" />
            <span>CPU</span>
          </div>
          <span className="text-xs font-mono text-gray-300">
            {stats.cpu_percent.toFixed(1)}%
          </span>
        </div>
        <StatBar value={stats.cpu_percent} color={cpuColor} />
      </div>

      {/* RAM */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MemoryStick className="w-3 h-3" />
            <span>RAM</span>
          </div>
          <span className="text-xs font-mono text-gray-300">
            {formatBytes(stats.mem_usage)} / {formatBytes(stats.mem_limit)}
          </span>
        </div>
        <StatBar value={stats.mem_percent} color={memColor} />
      </div>

      {/* Network */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Network className="w-3 h-3" />
          <span>Red</span>
        </div>
        <span className="text-xs font-mono text-gray-300">
          ↓{formatBytes(stats.network_rx)} ↑{formatBytes(stats.network_tx)}
        </span>
      </div>
    </div>
  )
}
