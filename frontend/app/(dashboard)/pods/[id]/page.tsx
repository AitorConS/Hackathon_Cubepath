import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, Square, Trash2 } from 'lucide-react'
import TerminalComponent from '@/components/Terminal'
import FileExplorer from '@/components/FileExplorer'

export const dynamic = 'force-dynamic'

async function getPod(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  
  if (!data.session) return null

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods/${id}`, {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      },
      cache: 'no-store'
    })
    
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Failed to fetch pod:", error)
    return null
  }
}

export default async function PodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pod = await getPod(id)

  if (!pod) {
    redirect('/dashboard?error=Pod no encontrado')
  }

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
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${pod.Status === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                {pod.Status}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">ID: {pod.ID}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {pod.Status === 'running' && (
            <form action={`/pods/${id}/stop`} method="POST">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
                <Square className="w-4 h-4 text-yellow-500" />
                <span>Detener</span>
              </button>
            </form>
          )}
          <form action={`/pods/${id}/delete`} method="POST">
            <button className="flex items-center space-x-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-lg text-sm font-medium transition-colors border border-red-900/50">
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>
          </form>
        </div>
      </header>

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
    </div>
  )
}
