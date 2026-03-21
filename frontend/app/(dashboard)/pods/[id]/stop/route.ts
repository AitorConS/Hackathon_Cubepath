import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    return redirect('/login')
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pods/${id}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`
      }
    })

    if (!res.ok) {
      console.error("Backend error stopping pod")
    }
  } catch (error) {
    console.error("Failed to stop pod:", error)
  }
  
  return redirect(`/pods/${id}`)
}
