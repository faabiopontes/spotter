const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_TOKEN;
const polling = eval(process.env.TELEGRAM_POLLING);
const groupSignalsId = process.env.TELEGRAM_GROUP_SIGNALS_ID;
const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
const adminChatId = process.env.TELEGRAM_ADMIN_ID;

const bot = new TelegramBot(token, { polling: polling ? true : false });

const sendMessage = (message) => {
  console.log(`bot.sendMessage: ${message}`);
  bot.sendMessage(groupSignalsId, message, { parse_mode: 'HTML'});
  bot.sendMessage(groupChatId, message, { parse_mode: 'HTML'});
};

const sendMessageGroupChat = (message) => {
  console.log(`bot.sendMessageGroupChat: ${message}`);
  bot.sendMessage(groupChatId, message, { parse_mode: 'HTML'});
};

const sendMessageGroupSignals = (message) => {
  console.log(`bot.sendMessageGroupSignals: ${message}`);
  bot.sendMessage(groupSignalsId, message, { parse_mode: 'HTML'});
};

const sendMessageAdmin = (message) => {
  console.log(`bot.sendMessageAdmin: ${message}`);
  bot.sendMessage(adminChatId, message, { parse_mode: 'HTML'});
};

// console.log({ dirName: __dirname });
// bot.sendMessage(adminChatId, 'Quando vem um loss depois de 15 wins');
// bot.sendVideoNote(adminChatId, './assets/videos/crying_money.mp4');

module.exports = { sendMessage, sendMessageAdmin, sendMessageGroupChat, sendMessageGroupSignals };
