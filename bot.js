const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_TOKEN;
const polling = eval(process.env.TELEGRAM_POLLING);
const groupSignalsId = process.env.TELEGRAM_GROUP_SIGNALS_ID;
const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
const adminChatId = process.env.TELEGRAM_ADMIN_ID;
const rodrisChatId = process.env.TELEGRAM_RODRIS_ID;

const bot = new TelegramBot(token, { polling: polling ? true : false });

const sendMessage = (message) => {
  console.log(`bot.sendMessage: ${message}`);
  bot.sendMessage(groupSignalsId, message, { parse_mode: "HTML" });
  bot.sendMessage(groupChatId, message, { parse_mode: "HTML" });
};

const sendMessageGroupChat = (message) => {
  console.log(`bot.sendMessageGroupChat: ${message}`);
  bot.sendMessage(groupChatId, message, { parse_mode: "HTML" });
};

const sendMessageGroupSignals = (message) => {
  console.log(`bot.sendMessageGroupSignals: ${message}`);
  bot.sendMessage(groupSignalsId, message, { parse_mode: "HTML" });
};

const sendMessageAdmin = (message) => {
  console.log(`bot.sendMessageAdmin: ${message}`);
  bot.sendMessage(adminChatId, message, { parse_mode: "HTML" });
};

const sendMessageRodris = (message) => {
  console.log(`bot.sendMessageRodris: ${message}`);
  bot.sendMessage(rodrisChatId, message, { parse_mode: "HTML" });
};

module.exports = {
  sendMessage,
  sendMessageAdmin,
  sendMessageGroupChat,
  sendMessageGroupSignals,
  sendMessageRodris,
};
