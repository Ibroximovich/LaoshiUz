import { Bot, InlineKeyboard } from 'grammy';

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webAppUrl = process.env.WEB_APP_URL?.trim() || 'https://laoshi-uz.vercel.app';

export const bot: Bot | null = token ? new Bot(token) : null;

if (bot) {
  bot.command('start', async (ctx) => {
    const firstName = ctx.from?.first_name || 'Do‘stim';
    const keyboard = new InlineKeyboard().webApp('📚 LaoshiUz ilovasini ochish', webAppUrl);

    await ctx.reply(
      `Salom, ${firstName}! Xush kelibsiz, LaoshiUz platformasiga! Xitoy tilini o‘rganishni boshlash uchun quyidagi tugmani bosing:`,
      { reply_markup: keyboard }
    );
  });
} else {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram bot is disabled.');
}
