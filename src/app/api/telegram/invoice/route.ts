import { NextRequest, NextResponse } from 'next/server';
import { STREET_PASS_PLANS } from '@/lib/streetpass';

const TELEGRAM_API = 'https://api.telegram.org';
const DEFAULT_BOT_TOKEN = '9283056362:AAFMJQfV3Hjjp8_MornRiK4IxG6OS39SrjI';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
}

export async function POST(req: NextRequest) {
  const token = getBotToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Telegram Bot token is not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { planId, userId } = body;

    const plan = STREET_PASS_PLANS.find((p) => p.id === planId) || STREET_PASS_PLANS[0];

    const invoicePayload = JSON.stringify({
      planId: plan.id,
      durationDays: plan.durationDays,
      userId: userId || 'anonymous',
      stars: plan.starsAmount,
      created: Date.now(),
    });

    const res = await fetch(`${TELEGRAM_API}/bot${token}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `⚡ Street Pass — ${plan.name}`,
        description: `Доступ к соревновательным PvP дуэлям, неоновому следу бегуна и MVP-гимну на ${plan.durationDays} дней!`,
        payload: invoicePayload,
        currency: 'XTR',
        prices: [
          {
            label: `Street Pass (${plan.durationDays} дн.)`,
            amount: plan.starsAmount,
          },
        ],
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.description || 'Failed to create invoice' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      invoiceLink: data.result,
      plan,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
