import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const image = searchParams.get('image')

  if (!image) {
    return NextResponse.json({ error: 'Image parameter is required' }, { status: 400 })
  }

  // Parse namespace and repository
  // e.g., "ubuntu" -> "library/ubuntu", "linuxserver/code-server" -> "linuxserver/code-server"
  let repo = image
  if (!repo.includes('/')) {
    repo = `library/${repo}`
  }

  try {
    const res = await fetch(`https://hub.docker.com/v2/repositories/${repo}/tags?page_size=30`, {
      next: { revalidate: 3600 } // Cache results for 1 hour to avoid rate limits
    })

    if (!res.ok) {
      console.error(`Failed to fetch Docker tags for ${repo}:`, res.statusText)
      return NextResponse.json({ tags: [] })
    }

    const data = await res.json()
    const tags = data.results.map((r: any) => r.name)

    return NextResponse.json({ tags })
  } catch (error) {
    console.error(`Error fetching Docker tags for ${repo}:`, error)
    return NextResponse.json({ tags: [] })
  }
}
