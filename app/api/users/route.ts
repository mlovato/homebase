import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/apiAuth'
import { handleListUsers, handleCreateUser } from './handler'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(handleListUsers(getDb()))
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const result = await handleCreateUser(getDb(), body)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}
