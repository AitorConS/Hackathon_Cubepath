'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Globe, Plus, Trash2, ExternalLink, Loader2, Copy, CheckCircle } from 'lucide-react'

interface Tunnel {
  ID: string
  PodID: string
  Port: number
  PublicURL: string
  Status: string
  CreatedAt: string
}

interface Pod {
  ID: string
  Name: string
  Status: string
}

export default function TunnelsPage() {
  const [tunnels, setTunnels] = useState<Tunnel[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedPod, setSelectedPod] = useState('')
  const [port, setPort] = useState('80')
  const [polling, setPolling] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const getToken = async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  const fetchTunnels = useCallback(async () => {
    const token = await getToken()
    const res = await fetch(`${apiUrl}/tunnels`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setTunnels(data || [])
    }
  }, [apiUrl])

  const fetchPods = useCallback(async () => {
    const token = await getToken()
    const res = await fetch(`${apiUrl}/pods`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const data = await res.json()
      setPods((data || []).filter((p: Pod) => p.Status === 'running'))
    }
  }, [apiUrl])

  useEffect(() => {
    Promise.all([fetchTunnels(), fetchPods()]).finally(() => setLoading(false))
  }, [fetchTunnels, fetchPods])

  // Poll for a starting tunnel until it becomes active
  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/tunnels/${polling}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.is_running && data.public_url) {
          setPolling(null)
          fetchTunnels()
        }
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [polling, apiUrl, fetchTunnels])

  const createTunnel = async () => {
    if (!selectedPod || !port) return
    setCreating(true)
    try {
      const token = await getToken()
      const res = await fetch(`${apiUrl}/tunnels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pod_id: selectedPod, port: parseInt(port) })
      })
      if (res.ok) {
        const tunnel = await res.json()
        setShowModal(false)
        await fetchTunnels()
        setPolling(tunnel.ID) // start polling for the URL
      }
    } finally {
      setCreating(false)
    }
  }

  const deleteTunnel = async (id: string) => {
    const token = await getToken()
    await fetch(`${apiUrl}/tunnels/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchTunnels()
  }

  const copyURL = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const podName = (podId: string) => pods.find(p => p.ID === podId)?.Name || podId.slice(0, 8) + '...'

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold mb-1">Túneles</h2>
          <p className="text-gray-400">Expone los puertos de tus contenedores a internet a través de Cloudflare Quick Tunnels.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Túnel</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando túneles...
        </div>
      ) : tunnels.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No hay túneles todavía.</p>
          <p className="text-sm mt-1">Crea un túnel para exponer un puerto de contenedor a internet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tunnels.map((t) => (
            <div key={t.ID} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Globe className={`w-5 h-5 ${t.Status === 'active' ? 'text-green-400' : 'text-yellow-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{podName(t.PodID)}</p>
                      <span className="text-gray-500">→</span>
                      <span className="font-mono text-sm text-blue-400">puerto {t.Port}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        t.Status === 'active' ? 'bg-green-900/50 text-green-400' :
                        t.Status === 'starting' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {t.Status === 'starting' ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />iniciando</span> : t.Status}
                      </span>
                    </div>
                    {t.PublicURL ? (
                      <a href={t.PublicURL} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 mt-0.5">
                        <span className="font-mono">{t.PublicURL}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500 mt-0.5">Esperando URL del túnel…</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {t.PublicURL && (
                    <button
                      onClick={() => copyURL(t.PublicURL, t.ID)}
                      title="Copiar URL"
                      className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                    >
                      {copied === t.ID ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => deleteTunnel(t.ID)}
                    className="p-2 rounded-lg hover:bg-red-900/30 transition-colors text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tunnel Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold">Crear Nuevo Túnel</h3>
              <p className="text-sm text-gray-400 mt-1">Un Cloudflare Quick Tunnel expondrá el puerto de tu contenedor a internet.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Pod</label>
                <select
                  value={selectedPod}
                  onChange={e => setSelectedPod(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un pod en ejecución…</option>
                  {pods.map(p => (
                    <option key={p.ID} value={p.ID}>{p.Name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Puerto del Contenedor</label>
                <input
                  type="number"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="80"
                  min="1"
                  max="65535"
                />
              </div>
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createTunnel}
                  disabled={creating || !selectedPod || !port}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear Túnel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
