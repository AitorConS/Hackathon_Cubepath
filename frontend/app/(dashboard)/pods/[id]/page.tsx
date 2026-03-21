'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Play, Square, Trash2, Loader2 } from 'lucide-react'
import TerminalComponent from '@/components/Terminal'
import FileExplorer from '@/components/FileExplorer'

interface Pod {
  ID: string
  Name: string
  Status: string
}

export default function PodDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [pod, setPod] = useState<Pod | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(true)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const getToken = async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  const fetchPod = useCallback(async () => {
    if (!id) return
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/pods/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        setPod(data)
        // Detener el polling cuando esté running
        if (data.Status === 'running') {
          setPolling(false)
        }
      }
    } catch (error) {
      console.error("Failed to fetch pod:", error)
    }
  }, [apiUrl, id])

  useEffect(() => {
    fetchPod().then(() => setLoading(false))
  }, [fetchPod])

  // Poll para actualizar el estado del pod
  useEffect(() => {
    if (!polling) return
    
    const interval = setInterval(() => {
      fetchPod()
    }, 2000) // Actualizar cada 2 segundos
    
    return () => clearInterval(interval)
  }, [polling, fetchPod])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-400">Cargando pod...</p>
        </div>
      </div>
    )
  }

  if (!pod) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <p className="text-gray-400">Pod no encontrado</p>
      </div>
    )
  }

  const isDeploying = pod.Status === 'creating'
  const isRunning = pod.Status === 'running'
  const statusColor = isRunning ? 'bg-green-500/10 text-green-500' : isDeploying ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'
  const statusText = isDeploying ? 'Desplegando' : pod.Status

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <header className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center space-x-3">
              <span>{pod.Name}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1 ${statusColor}`}>
                {isDeploying && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{statusText}</span>
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">ID: {pod.ID}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isRunning && (
            <form action={`/pods/${pod.ID}/stop`} method="POST">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
                <Square className="w-4 h-4 text-yellow-500" />
                <span>Detener</span>
              </button>
            </form>
          )}
          <form action={`/pods/${pod.ID}/delete`} method="POST">
            <button className="flex items-center space-x-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-900/50">
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </form>
        </div>
      </header>

      {isDeploying ? (
        <div className="flex-1 flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium text-gray-300 mb-2">Desplegando tu ambiente</p>
            <p className="text-sm text-gray-500">Esto puede tomar un momento...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Workspace Area (Terminal) */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800">
            <div className="p-2 bg-gray-900 border-b border-gray-800 text-xs font-medium text-gray-400">
              Terminal
            </div>
            <div className="flex-1 bg-black p-4 relative">
              <TerminalComponent podId={pod.ID} />
            </div>
          </div>

          {/* Sidebar (File Explorer) */}
          <div className="w-80 flex flex-col bg-gray-900">
            <div className="p-4 border-b border-gray-800 text-sm font-medium">
              Archivos
            </div>
            <div className="flex-1 overflow-y-auto">
              <FileExplorer podId={pod.ID} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
