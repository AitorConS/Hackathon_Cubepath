import { login, signup } from './actions'

export default async function LoginPage(props: { searchParams?: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">CubePod</h1>
          <p className="text-gray-400">Inicia sesión para gestionar tus contenedores</p>
        </div>
        
        {searchParams?.error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm text-center">
            {searchParams.error}
          </div>
        )}
        
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">Correo electrónico</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">Contraseña</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <div className="flex gap-4 pt-2">
            <button 
              formAction={login} 
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Iniciar sesión
            </button>
            <button 
              formAction={signup} 
              className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Registrarse
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
