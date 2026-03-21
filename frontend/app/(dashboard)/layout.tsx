import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Box, LayoutGrid, Globe } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Barra lateral */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Box className="w-6 h-6 text-blue-500" />
            <span>CubePod</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
            <LayoutGrid className="w-5 h-5" />
            <span>Mis Pods</span>
          </Link>
          <Link href="/tunnels" className="flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
            <Globe className="w-5 h-5" />
            <span>Túneles</span>
          </Link>
          <Link href="/templates" className="flex items-center space-x-3 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
            <Box className="w-5 h-5" />
            <span>Plantillas</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="mb-4 truncate text-sm text-gray-500">{user.email}</div>
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center space-x-3 px-3 py-2 text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
