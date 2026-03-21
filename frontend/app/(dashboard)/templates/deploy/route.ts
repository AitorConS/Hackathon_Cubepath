import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(request: Request) {
  const formData = await request.formData()
  const templateSlug = formData.get('templateSlug') as string
  const customName = formData.get('customName') as string
  const version = formData.get('version') as string

  if (!templateSlug) {
    return redirect('/templates?error=Missing Template Slug')
  }

  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    return redirect('/login')
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template_slug: templateSlug,
        name: customName || `My Pod`,
        version: version || undefined
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("Backend error creating pod:", errText)
      return redirect('/templates?error=Failed to deploy pod')
    }

    const pod = await res.json()
    console.log("Pod created:", pod)
    // Redirigir inmediatamente a la página del pod (sin esperar a que esté ready)
    return redirect(`/pods/${pod.ID}`)
  } catch (error) {
    console.error("Failed to deploy pod:", error)
    return redirect('/templates?error=Network Error')
  }
}

