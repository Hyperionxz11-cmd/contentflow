import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    let rawText = ''

    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      // Parse Word document
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    } else if (file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.md')) {
      // Plain text file
      rawText = await file.text()
    } else {
      return NextResponse.json({ error: 'Format non supporté. Utilisez .docx, .txt ou .md' }, { status: 400 })
    }

    // Split into individual posts
    // Try different separators: ---, ===, blank lines (double newline), or numbered items
    let posts: string[] = []

    if (rawText.includes('---')) {
      posts = rawText.split(/---+/).map(p => p.trim()).filter(p => p.length > 0)
    } else if (rawText.includes('===')) {
      posts = rawText.split(/===+/).map(p => p.trim()).filter(p => p.length > 0)
    } else if (rawText.includes('\n\n\n')) {
      // Triple newline separator
      posts = rawText.split(/\n{3,}/).map(p => p.trim()).filter(p => p.length > 0)
    } else {
      // Try numbered posts: "1.", "2.", etc.
      const numberedMatch = rawText.match(/^\d+[\.\)]/m)
      if (numberedMatch) {
        posts = rawText.split(/\n(?=\d+[\.\)])/).map(p => p.replace(/^\d+[\.\)]\s*/, '').trim()).filter(p => p.length > 0)
      } else {
        // Fallback: split by double newline (paragraphs)
        posts = rawText.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0)
      }
    }

    // Filter out very short entries (likely headers or artifacts)
    posts = posts.filter(p => p.length >= 20)

    // Limit to 100 posts max
    posts = posts.slice(0, 100)

    return NextResponse.json({
      posts,
      count: posts.length,
      filename: file.name
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
