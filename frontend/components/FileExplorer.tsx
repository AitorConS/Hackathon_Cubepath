'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText, Folder, RefreshCw, Save } from 'lucide-react'

export default function FileExplorer({ podId }: { podId: string }) {
  const [path, setPath] = useState('/')
  const [files, setFiles] = useState<string>('')
  const [loading, setLoading] = useState(false)
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')

  const supabase = createClient()

  const fetchFiles = async () => {
    setLoading(true)
    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods/${podId}/files?path=${path}`, {
        headers: { 'Authorization': `Bearer ${data.session.access_token}` }
      })
      if (res.ok) {
        setFiles(await res.text())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadFile = async (filename: string) => {
    const fullpath = path === '/' ? `/${filename}` : `${path}/${filename}`
    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods/${podId}/file?path=${fullpath}`, {
        headers: { 'Authorization': `Bearer ${data.session.access_token}` }
      })
      if (res.ok) {
        setFileContent(await res.text())
        setSelectedFile(fullpath)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveFile = async () => {
    if (!selectedFile) return
    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods/${podId}/file`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: selectedFile, content: fileContent })
      })
      alert("¡Archivo guardado con éxito!")
    } catch (e) {
      console.error(e)
      alert("Error al guardar.")
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [path, podId])

  if (selectedFile) {
    return (
      <div className="flex flex-col h-full bg-gray-900 border-t border-gray-800">
        <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
          <span className="text-sm font-medium truncate text-gray-300">{selectedFile}</span>
          <div className="flex space-x-2">
            <button onClick={() => setSelectedFile(null)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">Cerrar</button>
            <button onClick={saveFile} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded flex items-center space-x-1">
              <Save className="w-3 h-3" />
              <span>Guardar</span>
            </button>
          </div>
        </div>
        <textarea 
          value={fileContent} 
          onChange={e => setFileContent(e.target.value)}
          className="flex-1 w-full bg-black text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none"
        />
      </div>
    )
  }

  // Parse `ls -la` output naively
  const fileLines = files.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('total'))

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-2 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
        <input 
          value={path} 
          onChange={e => setPath(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && fetchFiles()}
          className="w-full bg-gray-800 text-sm text-gray-300 px-2 py-1 rounded border border-gray-700 mr-2"
        />
        <button onClick={fetchFiles} className="p-1.5 hover:bg-gray-700 rounded text-gray-400">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {fileLines.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No se encontraron archivos</div>
        ) : (
          <ul className="text-sm">
            {fileLines.map((line, i) => {
              const parts = line.trim().split(/\s+/)
              const name = parts.slice(8).join(' ')
              const isDir = line.startsWith('d')
              if (!name) return null
              // Skip . and ..
              if (name === '.' || name === '..') return null
              
              return (
                <li key={i} className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-800 border-b border-gray-800/50 cursor-pointer text-gray-300"
                    onClick={() => isDir ? setPath(path === '/' ? `/${name}` : `${path}/${name}`) : loadFile(name)}>
                  {isDir ? <Folder className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-gray-400" />}
                  <span className="truncate">{name}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
