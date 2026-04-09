import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdminRequest } from '@/lib/apiAuth'
import { handleImport } from './handler'

export async function POST(request: NextRequest) {
  const isAdmin = await isAdminRequest(request)
  const body = await request.json().catch(() => null)
  const result = handleImport(getDb(), body, isAdmin)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}
