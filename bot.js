const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_TOKEN;
const polling = eval(process.env.TELEGRAM_POLLING);
const chatId = process.env.TELEGRAM_GROUP_ID;
const adminChatId = process.env.TELEGRAM_ADMIN_ID;

const bot = new TelegramBot(token, { polling: polling ? true : false });

const sendMessage = (message) => {
  console.log(`bot.sendMessage: ${message}`);
  bot.sendMessage(chatId, message, { parse_mode: 'HTML'});
};

const sendMessageAdmin = (message) => {
  console.log(`bot.sendMessageAdmin: ${message}`);
  bot.sendMessage(adminChatId, message, { parse_mode: 'HTML'});
};

// console.log({ dirName: __dirname });
// bot.sendMessage(adminChatId, 'Quando vem um loss depois de 15 wins');
// bot.sendVideoNote(adminChatId, './assets/videos/crying_money.mp4');

module.exports = { sendMessage, sendMessageAdmin };
