import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdminRequest } from '@/lib/apiAuth'
import { handleGetLinks, handleCreateLink } from './handler'

export async function GET() {
  const data = handleGetLinks(getDb())
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const isAdmin = await isAdminRequest(request)
  const body = await request.json().catch(() => ({}))
  const result = handleCreateLink(getDb(), body, isAdmin)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}
