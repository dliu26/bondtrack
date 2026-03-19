import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

const STUB_BULLETS = [
  'Maria Rodriguez (Bond #TX-2024-0847) has a court date in 2 days at Collin County District Court — confirm she received the reminder and call her directly today.',
  'James Carter missed 2 consecutive weekly check-ins. Bond is flagged red. Consider contacting co-signer Robert Carter and issuing a locate order if unreachable.',
  'A payment of $450 for defendant Kevin Williams is 8 days overdue. Contact the co-signer today before it crosses the 14-day red threshold.',
  'Court date reminders are scheduled to go out this week for 4 defendants via SMS — no action required unless they fail to confirm.',
  'All remaining active bonds are on track with no immediate issues requiring attention today.',
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  // Check for cached briefing for today
  const { data: cached } = await supabase
    .from('briefings')
    .select('content')
    .eq('bondsman_id', user.id)
    .eq('date', today)
    .single()

  if (cached) {
    return Response.json({ bullets: JSON.parse(cached.content) })
  }

  // Stub mode: return hardcoded bullets when no real API key is set
  const isStub = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'stub'

  let bullets: string[]

  if (isStub) {
    bullets = STUB_BULLETS
  } else {
    // Real Claude implementation goes here when ANTHROPIC_API_KEY is set
    // const body = await request.json()
    // const { default: Anthropic } = await import('@anthropic-ai/sdk')
    // const client = new Anthropic()
    // const message = await client.messages.create({ ... })
    // bullets = parseBullets(message.content)
    bullets = STUB_BULLETS
  }

  // Cache the result
  await supabase.from('briefings').upsert({
    bondsman_id: user.id,
    date: today,
    content: JSON.stringify(bullets),
  }, { onConflict: 'bondsman_id,date' })

  return Response.json({ bullets })
}
