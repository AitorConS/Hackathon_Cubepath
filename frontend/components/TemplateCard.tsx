'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Server, ArrowRight, X, Loader2 } from 'lucide-react'
import ErrorAlert from './ErrorAlert'

export default function TemplateCard({ tpl }: { tpl: any }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [podName, setPodName] = useState(`My ${tpl.Name}`)
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<{ title: string; message: string } | null>(null)
  
  const defaultVersion = tpl.DockerImage.includes(':') ? tpl.DockerImage.split(':')[1] : 'latest'
  const baseImage = tpl.DockerImage.split(':')[0]
  
  const [version, setVersion] = useState(defaultVersion)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [loadingTags, setLoadingTags] = useState(false)

  useEffect(() => {
    if (showModal && availableTags.length === 0) {
      setLoadingTags(true)
      fetch(`/api/docker-tags?image=${encodeURIComponent(baseImage)}`)
        .then(res => res.json())
        .then(data => {
          let tags = data.tags || []
          if (!tags.includes(defaultVersion)) {
             tags = [defaultVersion, ...tags]
          }
          setAvailableTags(tags)
          setLoadingTags(false)
        })
        .catch(() => {
          setAvailableTags([defaultVersion, 'latest'])
          setLoadingTags(false)
        })
    }
  }, [showModal, baseImage, defaultVersion, availableTags.length])

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDeploying(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      
      if (!data.session) {
        setError({
          title: 'Error de autenticación',
          message: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.'
        })
        setIsDeploying(false)
        return
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_slug: tpl.Slug,
          name: podName,
          version: version || undefined
        })
      })

      if (!res.ok) {
        let errorMessage = 'Error interno en el servidor'
        
        if (res.status === 400) {
          // Validación: máximo de pods
          errorMessage = 'Número máximo de pods alcanzado. Elimina uno para crear otro.'
        } else if (res.status === 404) {
          errorMessage = 'Plantilla no encontrada'
        } else if (res.status === 500) {
          errorMessage = 'Error interno en el servidor'
        }

        setError({
          title: 'No se pudo desplegar el pod',
          message: errorMessage
        })
        setIsDeploying(false)
        return
      }

      const pod = await res.json()
      setShowModal(false)
      if (pod.ID) {
        router.push(`/pods/${pod.ID}`)
      }
    } catch (error) {
      console.error("Failed to deploy pod:", error)
      setError({
        title: 'Error de conexión',
        message: 'No se pudo conectar al servidor. Verifica tu conexión a internet.'
      })
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <>
      {error && (
        <ErrorAlert 
          title={error.title}
          message={error.message}
          onClose={() => setError(null)}
          type="error"
        />
      )}
      
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors flex flex-col">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Server className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{tpl.Name}</h3>
            <span className="text-xs font-mono text-gray-500">{tpl.DockerImage}</span>
          </div>
        </div>
        
        <p className="text-gray-400 text-sm mb-6 flex-1">
          {tpl.Description}
        </p>
        
        <button 
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          <span>Desplegar Entorno</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Desplegar {tpl.Name}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors" disabled={isDeploying}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleDeploy} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del Pod</label>
                <input 
                  type="text" 
                  value={podName}
                  onChange={e => setPodName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isDeploying}
                />
              </div>

              <div>
                <label className="flex text-sm font-medium text-gray-300 mb-1 justify-between">
                  <span>Versión (Tag de Imagen)</span>
                  {loadingTags && <span className="text-blue-400 flex items-center gap-1 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Buscando en Docker Hub...</span>}
                </label>
                {availableTags.length > 0 ? (
                  <select 
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    disabled={loadingTags || isDeploying}
                  >
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. latest, 20, 22.04"
                    disabled={loadingTags || isDeploying}
                  />
                )}
              </div>

              <div className="pt-4 flex space-x-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  disabled={isDeploying}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isDeploying}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Desplegando...
                    </>
                  ) : (
                    'Desplegar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
