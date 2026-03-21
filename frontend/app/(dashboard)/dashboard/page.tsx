'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Plus, Terminal, Trash2, Power, Loader2, X, AlertTriangle } from 'lucide-react'
import ErrorAlert from '@/components/ErrorAlert'

interface Pod {
  ID: string
  Name: string
  Status: string
  DockerContainerID: string
}

export default function DashboardPage() {
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ title: string; message: string } | null>(null)
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const MAX_PODS = 3

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

  const handleStopPod = async (podId: string) => {
    setActionLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/pods/${podId}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        setError({
          title: 'No se pudo parar el pod',
          message: 'Error interno en el servidor'
        })
      } else {
        setSelectedPodId(null)
        await fetchPods()
      }
    } catch (error) {
      console.error("Failed to stop pod:", error)
      setError({
        title: 'Error de conexión',
        message: 'No se pudo conectar al servidor'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeletePod = async (podId: string) => {
    setActionLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/pods/${podId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        setError({
          title: 'No se pudo borrar el pod',
          message: 'Error interno en el servidor'
        })
      } else {
        setSelectedPodId(null)
        await fetchPods()
      }
    } catch (error) {
      console.error("Failed to delete pod:", error)
      setError({
        title: 'Error de conexión',
        message: 'No se pudo conectar al servidor'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartPod = async (podId: string) => {
    setActionLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/pods/${podId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        setError({
          title: 'No se pudo encender el pod',
          message: 'Error interno en el servidor'
        })
      } else {
        setSelectedPodId(null)
        await fetchPods()
      }
    } catch (error) {
      console.error("Failed to start pod:", error)
      setError({
        title: 'Error de conexión',
        message: 'No se pudo conectar al servidor'
      })
    } finally {
      setActionLoading(false)
    }
  }

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

  const selectedPod = selectedPodId ? pods.find(p => p.ID === selectedPodId) : null

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {error && (
        <ErrorAlert 
          title={error.title}
          message={error.message}
          onClose={() => setError(null)}
          type="error"
        />
      )}
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold">Mis Pods</h2>
            <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm font-medium text-blue-400">
              {pods.length}/{MAX_PODS}
            </span>
          </div>
          <p className="text-gray-400">Gestiona tus entornos de contenedores activos.</p>
        </div>
        <Link 
          href="/templates" 
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            pods.length >= MAX_PODS
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={(e) => {
            if (pods.length >= MAX_PODS) {
              e.preventDefault()
              setError({
                title: 'Número máximo de pods alcanzado',
                message: `Solo puedes tener ${MAX_PODS} contenedores activos. Elimina uno para crear otro.`
              })
            }
          }}
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
                  <button 
                    onClick={() => setSelectedPodId(pod.ID)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Gestionar
                  </button>
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

      {/* Modal de gestión de pods */}
      {selectedPod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Gestionar Pod</h3>
              <button 
                onClick={() => setSelectedPodId(null)}
                disabled={actionLoading}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{selectedPod.Name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">ID: {selectedPod.DockerContainerID?.slice(0, 12)}</p>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={() => handleStartPod(selectedPod.ID)}
                  disabled={actionLoading || selectedPod.Status === 'running'}
                  className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    selectedPod.Status === 'running'
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400'
                  } disabled:opacity-50`}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Encender Pod
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleStopPod(selectedPod.ID)}
                  disabled={actionLoading || selectedPod.Status !== 'running'}
                  className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                    selectedPod.Status !== 'running'
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                  } disabled:opacity-50`}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      Parar Pod
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDeletePod(selectedPod.ID)}
                  disabled={actionLoading}
                  className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Borrar Pod
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedPodId(null)}
                  disabled={actionLoading}
                  className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>

              {selectedPod.Status !== 'running' && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">El pod debe estar ejecutándose para pararlo.</p>
                </div>
              )}
            </div>
          </div>
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
