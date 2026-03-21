'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Plus, Terminal, Trash2, Power, Loader2 } from 'lucide-react'

interface Pod {
  ID: string
  Name: string
  Status: string
  DockerContainerID: string
}

export default function DashboardPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const getToken = async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  const fetchPods = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/pods`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        setPods(data || [])
      }
    } catch (error) {
      console.error("Failed to fetch pods:", error)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchPods().then(() => setLoading(false))
  }, [fetchPods])

  // Poll para actualizar la lista de pods cada 2 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPods()
    }, 2000)
    
    return () => clearInterval(interval)
  }, [fetchPods])

  const getStatusDisplay = (status: string) => {
    if (status === 'creating') {
      return {
        text: 'Desplegando',
        color: 'bg-blue-500/10 text-blue-500',
        icon: true
      }
    }
    return {
      text: status,
      color: status === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500',
      icon: false
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-1">Mis Pods</h2>
          <p className="text-gray-400">Gestiona tus entornos de contenedores activos.</p>
        </div>
        <Link 
          href="/templates" 
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Pod</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando pods...
        </div>
      ) : pods && pods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pods.map((pod: Pod) => {
            const statusDisplay = getStatusDisplay(pod.Status)
            return (
              <div key={pod.ID} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold truncate" title={pod.Name}>{pod.Name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${statusDisplay.color}`}>
                    {statusDisplay.icon && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{statusDisplay.text}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-6 truncate">ID: {pod.DockerContainerID?.slice(0, 12)}</p>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <Link href={`/pods/${pod.ID}`} className="flex items-center text-sm font-medium text-blue-400 hover:text-blue-300">
                    <Terminal className="w-4 h-4 mr-2" />
                    Terminal
                  </Link>
                  <Link href={`/pods/${pod.ID}`} className="text-sm text-gray-400 hover:text-white">
                    Gestionar
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-24 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
          <Box className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No hay pods ejecutándose</h3>
          <p className="text-gray-400 mb-6">Aún no tienes entornos activos.</p>
          <Link 
            href="/templates" 
            className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Desplegar desde Plantilla
          </Link>
        </div>
      )}
    </div>
  )
}

function Box(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  )
}
