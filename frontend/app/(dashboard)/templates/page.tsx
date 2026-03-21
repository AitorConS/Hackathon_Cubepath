import { createClient } from '@/utils/supabase/server'
import TemplateCard from '@/components/TemplateCard'

export const dynamic = 'force-dynamic'

async function getTemplates() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  
  if (!data.session) return []

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/templates`, {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      },
      cache: 'no-store'
    })
    
    if (!res.ok) {
      const errText = await res.text()
      console.error("TEMPLATE FETCH FAILED:", res.status, errText)
      return []
    }
    const json = await res.json()
    console.log("FETCHED TEMPLATES:", json)
    return json
  } catch (error) {
    console.error("Failed to fetch templates:", error)
    return []
  }
}

export default async function TemplatesPage() {
  const templates = await getTemplates()

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">Plantillas</h2>
        <p className="text-gray-400">Despliega un nuevo entorno de contenedor desde nuestra lista curada.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates && templates.length > 0 ? templates.map((tpl: any) => (
          <TemplateCard key={tpl.ID} tpl={tpl} />
        )) : (
          <div className="col-span-full py-12 text-center text-gray-500">
            No templates available.
          </div>
        )}
      </div>
    </div>
  )
}
