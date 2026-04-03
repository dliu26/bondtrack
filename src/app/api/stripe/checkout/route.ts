import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 30,
    },
    success_url: 'https://www.mybondtrack.com/dashboard?upgraded=true',
    cancel_url: 'https://www.mybondtrack.com/pricing',
    customer_email: user.email,
    metadata: {
      supabase_user_id: user.id,
    },
  })

  return NextResponse.json({ url: session.url })
}
