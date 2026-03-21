'use client'

import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { createClient } from '@/utils/supabase/client'

export default function TerminalComponent({ podId }: { podId: string }) {
  const terminalRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!terminalRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#000000', foreground: '#ffffff' }
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    term.open(terminalRef.current)
    fitAddon.fit()

    let ws: WebSocket | null = null

    const initWs = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      
      if (!data.session) {
        term.writeln('Se requiere autenticación para conectar a la terminal.')
        return
      }

      if (typeof window === 'undefined') return
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws')
      const wsUrl = `${apiUrl}/pods/${podId}/terminal?token=${data.session.access_token}`

      ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        term.writeln('\x1b[32mConectado correctamente a la terminal del pod.\x1b[0m')
        
        // Autenticación personalizada a través del primer mensaje o podemos pasar el token a través del parámetro de consulta.
        // Por simplicidad y dado que los Websockets del navegador no soportan cabeceras personalizadas fácilmente,
        // en realidad necesitaremos enviar el token en la conexión o ponerlo en la cadena de consulta.
        // Espera, el backend actualmente lo espera en la cabecera Authorization a través del middleware.
        // ¡Los navegadores NO soportan cabeceras Authorization en WebSockets!
        // Lo pasaremos como un parámetro de consulta `?token=` y ajustaremos el backend, o dado que es un MVP,
        // simplemente lo emitiremos como el primer mensaje o parámetro de consulta. Supongamos un parámetro de consulta estándar.
      }

      ws.onmessage = (event) => {
        term.write(event.data)
      }

      ws.onerror = () => {
        term.writeln('\x1b[31mError de conexión.\x1b[0m')
      }

      ws.onclose = () => {
        term.writeln('\r\n\x1b[31mConexión cerrada.\x1b[0m')
      }

      term.onData((data) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(data)
        }
      })
    }

    // NOTE: This relies on Backend reading the token from query string if headers fail!
    // I need to go back and update the backend middleware in a sec.
    let isMounted = true
    initWs()

    const resizeObserver = new ResizeObserver(() => fitAddon.fit())
    resizeObserver.observe(terminalRef.current)

    return () => {
      isMounted = false
      if (ws) ws.close()
      term.dispose()
      resizeObserver.disconnect()
    }
  }, [podId])

  return <div ref={terminalRef} className="w-full h-full overflow-hidden" />
}
