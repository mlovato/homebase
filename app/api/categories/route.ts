import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdminRequest } from '@/lib/apiAuth'
import { handleGetCategories, handleCreateCategory } from './handler'

export async function GET() {
  const data = handleGetCategories(getDb())
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const isAdmin = await isAdminRequest()
  const body = await request.json().catch(() => ({}))
  const result = handleCreateCategory(getDb(), body, isAdmin)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}
