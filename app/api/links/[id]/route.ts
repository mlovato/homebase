import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isAdminRequest } from '@/lib/apiAuth'
import { handleUpdateLink, handleDeleteLink } from '../handler'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const isAdmin = await isAdminRequest(request)
  const body = await request.json().catch(() => ({}))
  const result = handleUpdateLink(getDb(), parseInt(id, 10), body, isAdmin)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params
  const isAdmin = await isAdminRequest(request)
  const result = handleDeleteLink(getDb(), parseInt(id, 10), isAdmin)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data, { status: result.status })
}
