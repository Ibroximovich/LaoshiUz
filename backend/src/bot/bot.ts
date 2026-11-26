import { RequestHandler } from 'express';
import { Bot, InlineKeyboard, webhookCallback } from 'grammy';

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webAppUrl = process.env.WEB_APP_URL?.trim() || 'https://laoshiuz.uz';

let bot: Bot | null = null;
let telegramWebhookMiddleware: RequestHandler | null = null;

if (token) {
  bot = new Bot(token);

  bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard().webApp('Platformani ochish', webAppUrl);
    await ctx.reply(
      "Xush kelibsiz, LaoshiUz platformasiga! Xitoy tilini o'rganishni boshlash uchun quyidagi tugmani bosing:",
      { reply_markup: keyboard }
    );
  });

  telegramWebhookMiddleware = webhookCallback(bot, 'express');
} else {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram bot is disabled.');
}

export function startBotPolling(): void {
  if (!bot) {
    return;
  }
  if (process.env.TELEGRAM_POLLING === 'true') {
    bot.start().catch((err) => {
      console.error('Telegram bot polling error:', err);
    });
  }
}

export { bot, telegramWebhookMiddleware };
