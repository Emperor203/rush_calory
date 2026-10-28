import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_API = 'https://api.telegram.org';
const DEFAULT_BOT_TOKEN = '9283056362:AAFMJQfV3Hjjp8_MornRiK4IxG6OS39SrjI';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
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
      allowed_updates: ['message', 'callback_query', 'inline_query'],
    });

    const menuButtonRes = await sendTelegramRequest('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '🏃 Бежать (Calorie Runner)',
        web_app: { url: appUrl },
      },
    });

    const setCommandsRes = await sendTelegramRequest('setMyCommands', {
      commands: [
        { command: 'start', description: 'Запустить Calorie Runner & главное меню' },
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

  // 1. Handle Inline Query (Share duels in any chat e.g. @bot 1km)
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
            message_text: `⚔️ *ВЫЗОВ НА ДУЭЛЬ В CALORIE RUNNER!*\n\n🏃 Дистанция: *${targetKm} км*\n🏁 Кто первым набежит дистанцию — забирает титул чемпиона и победный гимн!\n\nПринимай вызов и побеждай на карте города! 👇`,
            parse_mode: 'Markdown',
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `⚔️ Принять бой (${targetKm} км)`,
                  web_app: { url: `${appUrl}?pvp=true&targetKm=${targetKm}` },
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
        `👑 *ЛИГИ И РАНГИ АТЛЕТОВ В CALORIE RUNNER*\n\n` +
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
            [{ text: '🏃 Открыть приложение', web_app: { url: appUrl } }],
          ],
        },
      });
    } else if (data === 'help') {
      const helpText =
        `ℹ️ *КАК ИГРАТЬ В CALORIE RUNNER*\n\n` +
        `1️⃣ *Сжигай калории*: Выбери еду (круассан 🥐, бургер 🍔, пицца 🍕) или задай ккал — приложение построит замкнутый кольцевой маршрут нужной длины.\n\n` +
        `2️⃣ *Беги по карте*: Твой аватар, скорость и живой след отображаются на карте в реальном времени.\n\n` +
        `3️⃣ *PvP Дуэли*: Создай комнату, установи дистанцию (напр. 1 км), поделись 4-значным кодом с другом и бегите наперегонки. Кто первым набежит цель — забирает кубок 🏆!\n\n` +
        `4️⃣ *Street Pass*: Открывает студию гимнов и неоновые следы бега!`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: helpText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Начать забег', web_app: { url: appUrl } }],
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
              { text: '⚡ Спринт 0.5 км', web_app: { url: `${appUrl}?pvp=true&km=0.5` } },
              { text: '🏃 Классика 1.0 км', web_app: { url: `${appUrl}?pvp=true&km=1.0` } },
            ],
            [
              { text: '🔥 Драйв 2.0 км', web_app: { url: `${appUrl}?pvp=true&km=2.0` } },
              { text: '⚡ Марафон 5.0 км', web_app: { url: `${appUrl}?pvp=true&km=5.0` } },
            ],
            [
              { text: '👥 Вызвать друга в чате', switch_inline_query: '1.0' },
            ],
          ],
        },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // 3. Handle Chat Messages
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const fromUser = update.message.from;
    const firstName = fromUser?.first_name || 'Атлет';

    if (text.startsWith('/start')) {
      const welcomeText =
        `⚡ *Привет, ${firstName}! Добро пожаловать в Calorie Runner MMO!*\n\n` +
        `Твой город теперь — живая спортивная арена:\n\n` +
        `🏃 *Реальные бегуны на карте*: видь атлетов рядом с тобой в прямом эфире\n` +
        `🥐 *Калории в маршруты*: превращай съеденную еду в кольцевые треки\n` +
        `⚔️ *PvP Дуэли в реальном времени*: соревнуйся наперегонки на 0.5, 1, 2 или 5 км\n` +
        `🎵 *MVP-Гимны и Неоновые Следы*: побеждай и включай свой гимн на финише!\n\n` +
        `Нажимай кнопку ниже, чтобы начать! 👇`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🏃 Запустить Calorie Runner',
                web_app: { url: appUrl },
              },
            ],
            [
              {
                text: '⚔️ PvP Дуэль (Комната)',
                web_app: { url: `${appUrl}?pvp=true` },
              },
              {
                text: '👥 Вызвать друга в чате',
                switch_inline_query: '1.0',
              },
            ],
            [
              {
                text: '👑 Лиги и Ранги',
                callback_data: 'ranks',
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
              { text: '⚡ Спринт 0.5 км', web_app: { url: `${appUrl}?pvp=true&km=0.5` } },
              { text: '🏃 Стандарт 1.0 км', web_app: { url: `${appUrl}?pvp=true&km=1.0` } },
            ],
            [
              { text: '🔥 Драйв 2.0 км', web_app: { url: `${appUrl}?pvp=true&km=2.0` } },
              { text: '⚡ Про 5.0 км', web_app: { url: `${appUrl}?pvp=true&km=5.0` } },
            ],
            [
              { text: '👥 Вызвать друга в чате', switch_inline_query: '1.0' },
            ],
          ],
        },
      });
    } else if (text.startsWith('/ranks')) {
      const ranksText =
        `👑 *ЛИГИ И РАНГИ АТЛЕТОВ В CALORIE RUNNER*\n\n` +
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
            [{ text: '🏃 Открыть приложение', web_app: { url: appUrl } }],
          ],
        },
      });
    } else if (text.startsWith('/help')) {
      const helpText =
        `ℹ️ *КАК ИГРАТЬ В CALORIE RUNNER*\n\n` +
        `1️⃣ *Сжигай калории*: Выбери еду (круассан, бургер) ➔ построй кольцевой трек.\n` +
        `2️⃣ *Беги*: Твой аватар и скорость отображаются на живой карте.\n` +
        `3️⃣ *PvP*: Создай комнату, зови друга по коду и побеждай наперегонки!`;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: helpText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Начать забег', web_app: { url: appUrl } }],
          ],
        },
      });
    } else {
      // Default echo reply
      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: `🏃 Нажми кнопку ниже, чтобы запустить Calorie Runner!`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Запустить Calorie Runner', web_app: { url: appUrl } }],
          ],
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
