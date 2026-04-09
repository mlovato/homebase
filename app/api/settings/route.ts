import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdminRequest } from '@/lib/apiAuth'
import { handleGetSettings, handleUpdateSettings } from './handler'

export async function GET() {
  return NextResponse.json(handleGetSettings(getDb()))
}

export async function PUT(request: NextRequest) {
  const isAdmin = await isAdminRequest(request)
  const body = await request.json().catch(() => ({}))
  const result = handleUpdateSettings(getDb(), body, isAdmin)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}
