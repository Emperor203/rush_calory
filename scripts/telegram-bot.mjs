#!/usr/bin/env node

/**
 * Calorie Runner Telegram Bot (Long-Polling Mode)
 * Usage:
 *   node scripts/telegram-bot.mjs
 */

import fs from 'fs';
import path from 'path';

// Load .env.local if present
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      if (k && v.length) {
        process.env[k.trim()] = v.join('=').trim();
      }
    }
  }
} catch (e) {}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rush-calory.vercel.app';
const TELEGRAM_API = 'https://api.telegram.org';

if (!TOKEN) {
  console.error('\n❌ Ошибка: Переменная TELEGRAM_BOT_TOKEN не задана!');
  console.log('Добавьте её в .env.local или запустите:');
  console.log('  export TELEGRAM_BOT_TOKEN="ВАШ_ТОКЕН"');
  console.log('  node scripts/telegram-bot.mjs\n');
  process.exit(1);
}

async function api(method, body = {}) {
  const res = await fetch(`${TELEGRAM_API}/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await res.json();
}

async function init() {
  // Clear any existing webhook so polling works
  await api('deleteWebhook', { drop_pending_updates: false });

  const me = await api('getMe');
  if (!me.ok) {
    console.error('❌ Не удалось подключиться к Telegram API:', me.description);
    process.exit(1);
  }

  console.log(`\n🚀 Calorie Runner Telegram Bot запущен!`);
  console.log(`👤 Бот: @${me.result.username} (${me.result.first_name})`);
  console.log(`🌐 Mini App URL: ${APP_URL}`);
  console.log(`📡 Режим: Long-Polling\n`);

  // Setup Menu Button Web App
  await api('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '🏃 Бежать (Calorie Runner)',
      web_app: { url: APP_URL },
    },
  });

  // Setup Commands Menu
  await api('setMyCommands', {
    commands: [
      { command: 'start', description: 'Главное меню & Запуск игры' },
      { command: 'duel', description: 'PVP Дуэль наперегонки' },
      { command: 'ranks', description: 'Лиги и Ранги атлетов' },
      { command: 'help', description: 'Правила игры' },
    ],
  });

  let offset = 0;

  while (true) {
    try {
      const updates = await api('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query', 'inline_query'],
      });

      if (updates.ok && updates.result) {
        for (const update of updates.result) {
          offset = update.update_id + 1;
          handleUpdate(update).catch((e) => console.error('Handler error:', e));
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function handleUpdate(update) {
  // 1. Inline Query (@bot 1km)
  if (update.inline_query) {
    const q = parseFloat(update.inline_query.query?.trim()) || 1.0;
    const km = Math.max(0.1, Math.min(42.2, q));

    await api('answerInlineQuery', {
      inline_query_id: update.inline_query.id,
      cache_time: 10,
      results: [
        {
          type: 'article',
          id: `pvp-${km}`,
          title: `⚔️ Вызов на PvP Дуэль (${km} км)`,
          description: `Брось вызов друзьям: кто первым набежит ${km} км!`,
          thumb_url: 'https://rush-calory.vercel.app/avatar.jpg',
          input_message_content: {
            message_text: `⚔️ *ВЫЗОВ НА ДУЭЛЬ В CALORIE RUNNER!*\n\n🏃 Дистанция: *${km} км*\n🏁 Кто первым набежит дистанцию — побеждает и забирает кубок!\n\nПринимай вызов прямо сейчас:`,
            parse_mode: 'Markdown',
          },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `⚔️ Принять бой (${km} км)`,
                  web_app: { url: `${APP_URL}?pvp=true&targetKm=${km}` },
                },
              ],
            ],
          },
        },
      ],
    });
    return;
  }

  // 2. Callback Query
  if (update.callback_query) {
    const chatId = update.callback_query.message?.chat?.id;
    const data = update.callback_query.data;

    await api('answerCallbackQuery', { callback_query_id: update.callback_query.id });

    if (data === 'ranks') {
      await api('sendMessage', {
        chat_id: chatId,
        text:
          `👑 *ЛИГИ И РАНГИ АТЛЕТОВ В CALORIE RUNNER*\n\n` +
          `🪵 *Wood Athlete* — 0 - 500 ккал\n` +
          `🥉 *Bronze Runner* — 500 - 1,500 ккал\n` +
          `🥈 *Silver Pacer* — 1,500 - 3,500 ккал\n` +
          `🥇 *Gold Sprinter* — 3,500 - 7,000 ккал\n` +
          `💎 *Platinum Turbo* — 7,000 - 12,000 ккал\n` +
          `⚡ *Carbon Monster* — 12,000+ ккал!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🏃 Открыть приложение', web_app: { url: APP_URL } }]],
        },
      });
    } else if (data === 'help') {
      await api('sendMessage', {
        chat_id: chatId,
        text:
          `ℹ️ *ПРАВИЛА ИГРЫ*\n\n` +
          `1️⃣ Задавай калории ➔ получай круговой трек.\n` +
          `2️⃣ Беги по GPS на живой карте города.\n` +
          `3️⃣ Создавай PvP-комнаты и побеждай друзей наперегонки!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🏃 Начать забег', web_app: { url: APP_URL } }]],
        },
      });
    }
    return;
  }

  // 3. Messages
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const name = update.message.from?.first_name || 'Атлет';

    if (text.startsWith('/start')) {
      await api('sendMessage', {
        chat_id: chatId,
        text:
          `⚡ *Привет, ${name}! Добро пожаловать в Calorie Runner MMO!*\n\n` +
          `Твой город теперь — живая соревновательная арена:\n\n` +
          `🏃 *Реальные бегуны на карте*: видь соперников вокруг в реальном времени\n` +
          `🥐 *Калории в маршруты*: сжигай круассаны и бургеры по кольцевым трекам\n` +
          `⚔️ *PvP Дуэли*: создавай комнату на дистанцию (1 км, 2 км) и беги наперегонки\n` +
          `🎵 *MVP-Гимны и Неоновые Следы*: побеждай и врубай свой гимн!\n\n` +
          `Запускай игру кнопкой ниже! 👇`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏃 Запустить Calorie Runner', web_app: { url: APP_URL } }],
            [
              { text: '⚔️ PvP Дуэль (Комната)', web_app: { url: `${APP_URL}?pvp=true` } },
              { text: '👥 Вызвать друга в чате', switch_inline_query: '1.0' },
            ],
            [
              { text: '👑 Лиги и Ранги', callback_data: 'ranks' },
              { text: 'ℹ️ Как играть', callback_data: 'help' },
            ],
          ],
        },
      });
    } else if (text.startsWith('/duel') || text.startsWith('/pvp')) {
      await api('sendMessage', {
        chat_id: chatId,
        text: `⚔️ *АРЕНА PVP ДУЭЛЕЙ*\n\nВыбирай дистанцию и беги наперегонки:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ Спринт 0.5 км', web_app: { url: `${APP_URL}?pvp=true&km=0.5` } },
              { text: '🏃 Стандарт 1.0 км', web_app: { url: `${APP_URL}?pvp=true&km=1.0` } },
            ],
            [
              { text: '🔥 Драйв 2.0 км', web_app: { url: `${APP_URL}?pvp=true&km=2.0` } },
              { text: '⚡ Марафон 5.0 км', web_app: { url: `${APP_URL}?pvp=true&km=5.0` } },
            ],
            [{ text: '👥 Вызвать друга в чате', switch_inline_query: '1.0' }],
          ],
        },
      });
    } else {
      await api('sendMessage', {
        chat_id: chatId,
        text: `🏃 Нажми кнопку ниже, чтобы войти в Calorie Runner!`,
        reply_markup: {
          inline_keyboard: [[{ text: '🏃 Запустить Calorie Runner', web_app: { url: APP_URL } }]],
        },
      });
    }
  }
}

init();
