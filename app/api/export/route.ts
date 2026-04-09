import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdminRequest } from '@/lib/apiAuth'
import { handleExport } from './handler'

export async function GET(request: NextRequest) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(handleExport(getDb()))
}
