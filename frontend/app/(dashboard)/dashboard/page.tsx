import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, Terminal, Trash2, Power } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getPods() {
  const cookieStore = await import('next/headers').then(m => m.cookies())
  // The backend API needs the Supabase token
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  
  if (!data.session) return []

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods`, {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      },
      cache: 'no-store'
    })
    
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error("Failed to fetch pods:", error)
    return []
  }
}

export default async function DashboardPage() {
  const pods = await getPods()

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
          <Plus className="w-5 h-5 " />
          <span>Nuevo Pod</span>
        </Link>
      </div>

      {pods && pods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pods.map((pod: any) => (
            <div key={pod.ID} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold truncate" title={pod.Name}>{pod.Name}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${pod.Status === 'running' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                  {pod.Status}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-6 truncate">ID: {pod.DockerContainerID?.slice(0, 12)}</p>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <Link href={`/pods/${pod.ID}`} className="flex items-center text-sm font-medium text-blue-400 hover:text-blue-300">
                  <Terminal className="w-4 h-4 mr-2" />
                  Terminal
                </Link>
                {/* Se necesita componentes de cliente para la lógica de Detener/Eliminar */}
                <Link href={`/pods/${pod.ID}`} className="text-sm text-gray-400 hover:text-white">
                  Gestionar
                </Link>
              </div>
            </div>
          ))}
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
