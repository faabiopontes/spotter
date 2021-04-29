
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, {polling: true});
const chatId = process.env.TELEGRAM_GROUP_ID

const sendMessage = (message) => {
  bot.sendMessage(chatId, message);
}

module.exports = { sendMessage };