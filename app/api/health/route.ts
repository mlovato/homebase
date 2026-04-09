import { NextRequest, NextResponse } from 'next/server'
import { checkHealth } from './handler'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') ?? ''
  const status = await checkHealth(url)
  return NextResponse.json({ status })
}
