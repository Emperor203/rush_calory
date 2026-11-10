import { NextRequest, NextResponse } from 'next/server';
import {
  buildCoinsStreakWidgetHtml,
  getDefaultCoinsStreakState,
  parseCoinsWidgetState,
  applyCoinsWidgetAction,
  getMultiplier,
} from '@/lib/telegramWidget';

const TELEGRAM_API = 'https://api.telegram.org';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

async function sendCoinsWidget(chatId: number | string, appUrl: string) {
  const initialState = getDefaultCoinsStreakState();
  const res = await sendTelegramRequest('sendWidget', {
    chat_id: chatId,
    html: buildCoinsStreakWidgetHtml(),
    chat_data: JSON.stringify(initialState),
    allow_queries: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🏃 Выйти на пробежку (+Монеты)',
            web_app: { url: appUrl },
            style: 'success',
          },
        ],
      ],
    },
  });

  // Fallback if client or DC doesn't support sendWidget yet
  if (!res?.ok) {
    const mult = getMultiplier(initialState.streak);
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text:
        `🪙 *КОШЕЛЁК RUSH И ОГОНЁК ДНЯ!*\n\n` +
        `• Баланс: *${initialState.coins} RUSH 🪙*\n` +
        `• Стрик: *🔥 ${initialState.streak} дн.* (Множитель *x${mult}* = +${Math.round(50 * mult)} 🪙/км)\n\n` +
        `Открывай интерактивный кошелёк и покупай ❄️ Заморозку или 👑 Street Pass на 3 дня за монеты! 👇`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🪙 Открыть Кошелёк & Стрик 🔥', web_app: { url: `${appUrl}/widget` }, style: 'primary' }],
          [{ text: '🏃 Запустить Rush Calory', web_app: { url: appUrl }, style: 'success' }],
        ],
      },
    });
  }

  return res;
}

function getAppUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'rush-calory.vercel.app';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
}

async function sendTelegramRequest(method: string, body: Record<string, any>) {
  const token = getBotToken();
  if (!token) return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured' };

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * GET /api/telegram
 * Diagnostic & One-click Webhook Setup
 */
export async function GET(req: NextRequest) {
  const token = getBotToken();
  const appUrl = getAppUrl(req);
  const webhookUrl = `${appUrl}/api/telegram`;
  const action = req.nextUrl.searchParams.get('action');

  if (!token) {
    return NextResponse.json({
      ok: false,
      message: 'TELEGRAM_BOT_TOKEN не задан в переменных окружения.',
      hint: 'Добавьте TELEGRAM_BOT_TOKEN в Vercel Environment Variables или в .env.local',
      appUrl,
    });
  }

  // Setup Webhook & Menu Button action
  if (action === 'set_webhook') {
    const webhookRes = await sendTelegramRequest('setWebhook', {
      url: webhookUrl,
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query', 'inline_query', 'widget_query', 'pre_checkout_query'],
    });

    const menuButtonRes = await sendTelegramRequest('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '🏃 Бежать (Rush Calory)',
        web_app: { url: appUrl },
      },
    });

    const setCommandsRes = await sendTelegramRequest('setMyCommands', {
      commands: [
        { command: 'start', description: 'Запустить Rush Calory & ИИ-Сканер' },
        { command: 'widget', description: '🪙 Кошелёк RUSH и Стрик 🔥' },
        { command: 'duel', description: 'Создать PvP дуэль наперегонки' },
        { command: 'ranks', description: 'Ранги атлетов и Лиги' },
        { command: 'help', description: 'Как играть и правила игры' },
      ],
    });

    return NextResponse.json({
      ok: true,
      webhookRes,
      menuButtonRes,
      setCommandsRes,
      webhookUrl,
      appUrl,
    });
  }

  // Default: Get Bot Info & Webhook Info
  const botInfo = await sendTelegramRequest('getMe', {});
  const webhookInfo = await sendTelegramRequest('getWebhookInfo', {});

  return NextResponse.json({
    status: 'online',
    botInfo,
    webhookInfo,
    webhookUrl,
    appUrl,
    setupUrl: `${webhookUrl}?action=set_webhook`,
  });
}

/**
 * POST /api/telegram
 * Telegram Webhook Updates Handler
 */
export async function POST(req: NextRequest) {
  const token = getBotToken();
  if (!token) {
    return NextResponse.json({ error: 'Bot token not set' }, { status: 500 });
  }

  const appUrl = getAppUrl(req);
  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 1. Handle Pre-Checkout Query (Mandatory for Telegram Stars / Invoices)
  if (update.pre_checkout_query) {
    await sendTelegramRequest('answerPreCheckoutQuery', {
      pre_checkout_query_id: update.pre_checkout_query.id,
      ok: true,
    });
    return NextResponse.json({ ok: true });
  }

  // 1.5 Handle Telegram In-Message Widget Query (Bot API 10.4)
  if (update.widget_query) {
    const wq = update.widget_query;
    const queryId = wq.id;
    const action = String(wq.data || '');
    const chatId = wq.message?.chat?.id;
    const messageId = wq.message?.message_id;
    const currentRaw = wq.message?.widget?.chat_data || null;
    const currentState = parseCoinsWidgetState(currentRaw);
    const nextState = applyCoinsWidgetAction(currentState, action);
    const nextRaw = JSON.stringify(nextState);

    if (chatId && messageId) {
      await sendTelegramRequest('editMessageWidgetData', {
        chat_id: chatId,
        message_id: messageId,
        chat_data: nextRaw,
      });
    }

    await sendTelegramRequest('answerWidgetQuery', {
      widget_query_id: queryId,
      result: nextRaw.slice(0, 1024),
    });

    return NextResponse.json({ ok: true });
  }

  // 2. Handle Successful Payment Notification
  if (update.message?.successful_payment) {
    const chatId = update.message.chat.id;
    const payment = update.message.successful_payment;
    const totalStars = payment.total_amount;
    let planDays = 30;
    try {
      const payload = JSON.parse(payment.invoice_payload);
      if (payload.durationDays) planDays = payload.durationDays;
    } catch {}

    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text:
        `🎉 *ОПЛАТА УСПЕШНО ПОЛУЧЕНА!*\n\n` +
        `⚡ *${totalStars} Telegram Stars* зачислено!\n` +
        `🏆 Твой *Street Pass* активирован на *${planDays} дней*!\n\n` +
        `В приложении тебе открыты:\n` +
        `• ⚔️ Соревновательные PvP-дуэли\n` +
        `• 🌟 Неоновый след бегуна на карте\n` +
        `• 🎵 Студия победных гимнов\n\n` +
        `Удачных пробежек и побед! 🏃💨`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏃 Открыть Rush Calory', web_app: { url: appUrl }, style: 'success' }],
        ],
      },
    });

    return NextResponse.json({ ok: true });
  }

  // 3. Handle Inline Query (Share duels in any chat e.g. @bot 1km)
  if (update.inline_query) {
    const query = update.inline_query.query?.trim() || '1.0';
    const numKm = parseFloat(query) || 1.0;
    const targetKm = Math.max(0.1, Math.min(42.2, numKm));

    await sendTelegramRequest('answerInlineQuery', {
      inline_query_id: update.inline_query.id,
      cache_time: 10,
      results: [
        {
          type: 'article',
          id: `pvp-${targetKm}`,
          title: `⚔️ Вызов на PvP Дуэль (${targetKm} км)`,
          description: `Брось вызов друзьям: кто первым набежит ${targetKm} км!`,
          thumb_url: 'https://rush-calory.vercel.app/avatar.jpg',
          input_message_content: {
            message_text: `⚔️ *ВЫЗОВ НА ДУЭЛЬ В RUSH CALORY!*\n\n🏃 Дистанция: *${targetKm} км*\n🏁 Кто первым набежит дистанцию — забирает титул чемпиона и победный гимн!\n\nПринимай вызов и побеждай на карте города! 👇`,
            parse_mode: 'Markdown',
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `⚔️ Принять бой (${targetKm} км)`,
                  web_app: { url: `${appUrl}?pvp=true&targetKm=${targetKm}` },
                  style: 'danger',
                },
              ],
            ],
          },
        },
      ],
    });

    return NextResponse.json({ ok: true });
  }

  // 2. Handle Callback Queries (Button Clicks)
  if (update.callback_query) {
    const chatId = update.callback_query.message?.chat?.id;
    const data = update.callback_query.data;

    await sendTelegramRequest('answerCallbackQuery', {
      callback_query_id: update.callback_query.id,
    });

    if (data === 'ranks') {
      const ranksText =
        `👑 *ЛИГИ И РАНГИ АТЛЕТОВ В RUSH CALORY*\n\n` +
        `Каждый сожжённый калорий и километр повышают твой ранг:\n\n` +
        `🪵 *Wood Athlete* — Новичок (0 - 500 ккал)\n` +
        `🥉 *Bronze Runner* — 500 - 1,500 ккал\n` +
        `🥈 *Silver Pacer* — 1,500 - 3,500 ккал\n` +
        `🥇 *Gold Sprinter* — 3,500 - 7,000 ккал\n` +
        `💎 *Platinum Turbo* — 7,000 - 12,000 ккал\n` +
        `⚡ *Carbon Monster* — Элита (12,000+ ккал) с неоновым следом!\n\n` +
        `Беги каждый день, чтобы подняться на вершину!`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: ranksText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Открыть приложение', web_app: { url: appUrl }, style: 'success' }],
          ],
        },
      });
    } else if (data === 'help') {
      const helpText =
        `ℹ️ *КАК ИГРАТЬ В RUSH CALORY*\n\n` +
        `1️⃣ *ИИ-Сканер еды*: Сфотографируй пиццу, бургер или плов — Gemini 3.5 оценит калории и построит идеальный кольцевой трек от дома (45% / 70% / 100%).\n\n` +
        `2️⃣ *Беги по карте*: Твой аватар, скорость и живой след отображаются на карте в реальном времени.\n\n` +
        `3️⃣ *PvP Дуэли*: Создай комнату, установи дистанцию (напр. 1 км), поделись 4-значным кодом с другом и бегите наперегонки. Кто первым набежит цель — забирает кубок 🏆!\n\n` +
        `4️⃣ *Stories & Street Pass*: Генерируй неоновую карточку 9:16 для Telegram Stories и включай победный гимн!`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: helpText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Начать забег', web_app: { url: appUrl }, style: 'success' }],
          ],
        },
      });
    } else if (data === 'duel_menu') {
      const duelText =
        `⚔️ *АРЕНА PVP ДУЭЛЕЙ*\n\n` +
        `Выберите дистанцию для гонки наперегонки:`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: duelText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ Спринт 0.5 км', web_app: { url: `${appUrl}?pvp=true&km=0.5` }, style: 'primary' },
              { text: '🏃 Классика 1.0 км', web_app: { url: `${appUrl}?pvp=true&km=1.0` }, style: 'success' },
            ],
            [
              { text: '🔥 Драйв 2.0 км', web_app: { url: `${appUrl}?pvp=true&km=2.0` }, style: 'danger' },
              { text: '⚡ Марафон 5.0 км', web_app: { url: `${appUrl}?pvp=true&km=5.0` }, style: 'danger' },
            ],
            [
              { text: '👥 Вызвать друга в чате', switch_inline_query: '1.0', style: 'primary' },
            ],
          ],
        },
      });
    } else if (data === 'open_battery_widget') {
      await sendCoinsWidget(chatId, appUrl);
    }

    return NextResponse.json({ ok: true });
  }

  // 3. Handle Chat Messages
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const fromUser = update.message.from;
    const firstName = fromUser?.first_name || 'Атлет';

    if (text.startsWith('/widget') || text.startsWith('/streak') || text.startsWith('/coins')) {
      await sendCoinsWidget(chatId, appUrl);
    } else if (text.startsWith('/start')) {
      const welcomeText =
        `⚡ *Привет, ${firstName}! Добро пожаловать в Rush Calory MMO!*\n\n` +
        `Твой город теперь — живая спортивная арена:\n\n` +
        `📸 *ИИ-Сканер еды (Gemini 3.5)*: сфоткай блюдо и сожги его по умному маршруту от дома\n` +
        `🏃 *Реальные бегуны на карте*: видь атлетов рядом с тобой в прямом эфире\n` +
        `⚔️ *PvP Дуэли в реальном времени*: соревнуйся наперегонки на 0.5, 1, 2 или 5 км\n` +
        `🎵 *Stories и Неоновые Следы*: побеждай и делись карточками 9:16!\n\n` +
        `Нажимай зелёную кнопку ниже, чтобы начать! 👇`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🏃 Запустить Rush Calory',
                web_app: { url: appUrl },
                style: 'success',
              },
            ],
            [
              {
                text: '🪙 Кошелёк RUSH & Стрик 🔥',
                callback_data: 'open_battery_widget',
                style: 'primary',
              },
            ],
            [
              {
                text: '⚔️ PvP Дуэль (Комната)',
                web_app: { url: `${appUrl}?pvp=true` },
                style: 'danger',
              },
              {
                text: '👥 Вызвать друга в чате',
                switch_inline_query: '1.0',
                style: 'primary',
              },
            ],
            [
              {
                text: '👑 Лиги и Ранги',
                callback_data: 'ranks',
                style: 'primary',
              },
              {
                text: 'ℹ️ Как играть',
                callback_data: 'help',
              },
            ],
          ],
        },
      });
    } else if (text.startsWith('/duel') || text.startsWith('/pvp')) {
      const duelText =
        `⚔️ *АРЕНА PVP ДУЭЛЕЙ*\n\n` +
        `Создавай комнату, устанавливай километраж и беги наперегонки с соперником!\n` +
        `Кто первым набежит цель по GPS — побеждает! 🏆`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: duelText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ Спринт 0.5 км', web_app: { url: `${appUrl}?pvp=true&km=0.5` }, style: 'primary' },
              { text: '🏃 Стандарт 1.0 км', web_app: { url: `${appUrl}?pvp=true&km=1.0` }, style: 'success' },
            ],
            [
              { text: '🔥 Драйв 2.0 км', web_app: { url: `${appUrl}?pvp=true&km=2.0` }, style: 'danger' },
              { text: '⚡ Про 5.0 км', web_app: { url: `${appUrl}?pvp=true&km=5.0` }, style: 'danger' },
            ],
            [
              { text: '👥 Вызвать друга в чате', switch_inline_query: '1.0', style: 'primary' },
            ],
          ],
        },
      });
    } else if (text.startsWith('/ranks')) {
      const ranksText =
        `👑 *ЛИГИ И РАНГИ АТЛЕТОВ В RUSH CALORY*\n\n` +
        `🪵 *Wood Athlete* — Новичок (0 - 500 ккал)\n` +
        `🥉 *Bronze Runner* — 500 - 1,500 ккал\n` +
        `🥈 *Silver Pacer* — 1,500 - 3,500 ккал\n` +
        `🥇 *Gold Sprinter* — 3,500 - 7,000 ккал\n` +
        `💎 *Platinum Turbo* — 7,000 - 12,000 ккал\n` +
        `⚡ *Carbon Monster* — Элита (12,000+ ккал)!`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: ranksText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Открыть приложение', web_app: { url: appUrl }, style: 'success' }],
          ],
        },
      });
    } else if (text.startsWith('/help')) {
      const helpText =
        `ℹ️ *КАК ИГРАТЬ В RUSH CALORY*\n\n` +
        `1️⃣ *ИИ-Сканер еды*: Сфотографируй блюдо ➔ получи калории и кольцевой трек от дома.\n` +
        `2️⃣ *Беги*: Твой аватар и скорость отображаются на живой карте.\n` +
        `3️⃣ *PvP*: Создай комнату, зови друга по коду и побеждай наперегонки!`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: helpText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Начать забег', web_app: { url: appUrl }, style: 'success' }],
          ],
        },
      });
    } else {
      // Default echo reply
      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: `🏃 Нажми кнопку ниже, чтобы запустить Rush Calory!`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Запустить Rush Calory', web_app: { url: appUrl }, style: 'success' }],
          ],
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
