import { NextRequest, NextResponse } from 'next/server'
import { searchIcons } from './handler'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  const results = await searchIcons(q)
  return NextResponse.json({ results })
}
