const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const { findAllNewWord } = require('./notion');
const schedule = require('node-schedule');

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const channelID = process.env.TELEGRAM_CHANNEL_ID;

schedule.scheduleJob('0 9 * * *', async () => {
    const data = await findAllNewWord();
    const numWordsToSend = 5;
    const randomIndices = getRandomIndices(data.length, numWordsToSend);
    let message = '';
    let i = 0;
    randomIndices.forEach((index) => {
        const randomWord = data[index];
        if (randomWord?.english && randomWord?.vietnamese && randomWord?.sound) {
            message += `${++i}. ${randomWord.english}: ${randomWord.vietnamese}\n`;
        }
    });
    bot.telegram.sendMessage(channelID, message);
});

function getRandomIndices(max, count) {
    const indices = [];
    while (indices.length < count) {
        const randomIndex = Math.floor(Math.random() * max);
        if (!indices.includes(randomIndex)) {
            indices.push(randomIndex);
        }
    }
    return indices;
}

module.exports = { bot }
