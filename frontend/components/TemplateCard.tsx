'use client'

import { useState, useEffect } from 'react'
import { Server, ArrowRight, X, Loader2 } from 'lucide-react'

export default function TemplateCard({ tpl }: { tpl: any }) {
  const [showModal, setShowModal] = useState(false)
  const [podName, setPodName] = useState(`My ${tpl.Name}`)
  
  const defaultVersion = tpl.DockerImage.includes(':') ? tpl.DockerImage.split(':')[1] : 'latest'
  const baseImage = tpl.DockerImage.split(':')[0]
  
  const [version, setVersion] = useState(defaultVersion)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [loadingTags, setLoadingTags] = useState(false)

  // Buscar etiquetas solo cuando el modal se abre por primera vez
  useEffect(() => {
    if (showModal && availableTags.length === 0) {
      setLoadingTags(true)
      fetch(`/api/docker-tags?image=${encodeURIComponent(baseImage)}`)
        .then(res => res.json())
        .then(data => {
          let tags = data.tags || []
          // Asegurar que la versión por defecto esté siempre en la lista
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

  return (
    <>
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
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form action={`/templates/deploy`} method="POST" className="p-6 space-y-4">
              <input type="hidden" name="templateSlug" value={tpl.Slug} />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del Pod</label>
                <input 
                  type="text" 
                  name="customName" 
                  value={podName}
                  onChange={e => setPodName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="flex text-sm font-medium text-gray-300 mb-1 justify-between">
                  <span>Versión (Tag de Imagen)</span>
                  {loadingTags && <span className="text-blue-400 flex items-center gap-1 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Buscando en Docker Hub...</span>}
                </label>
                {availableTags.length > 0 ? (
                  <select 
                    name="version" 
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    disabled={loadingTags}
                  >
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    name="version" 
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. latest, 20, 22.04"
                    disabled={loadingTags}
                  />
                )}
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
                  type="submit" 
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Desplegar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
