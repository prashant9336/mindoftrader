import { NextRequest, NextResponse } from 'next/server'
import { sql, IS_DB_CONFIGURED } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  if (!IS_DB_CONFIGURED) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { email, password, name } = await req.json()

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { rows: existing } = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `
  if (existing[0]) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password as string, 12)

  const { rows: [user] } = await sql`
    INSERT INTO users (email, name, password_hash, trading_mode)
    VALUES (${email}, ${name}, ${hash}, 'paper')
    RETURNING id, email, name
  `

  return NextResponse.json({ user }, { status: 201 })
}
