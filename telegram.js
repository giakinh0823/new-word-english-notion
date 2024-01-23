const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const { findAllNewWord, findTodaySchedular } = require('./notion');
const schedule = require('node-schedule');

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const channelIdEnglish = process.env.TELEGRAM_CHANNEL_ID_ENGLISH;
const channelIdCalendar = process.env.TELEGRAM_CHANNEL_ID_CALENDAR;

schedule.scheduleJob('0 */2 * * *', async () => {
    const data = await findAllNewWord();

    if(!data || data.length === 0) {
        return;
    }

    const numWordsToSend = 5;
    const randomIndices = getRandomIndices(data?.length, numWordsToSend);
    let message = '';
    let i = 0;
    randomIndices.forEach((index) => {
        const randomWord = data[index];
        if (randomWord?.english && randomWord?.vietnamese && randomWord?.sound) {
            message += `${++i}. ${randomWord.english}: ${randomWord.vietnamese}\n`;
        }
    });
    bot.telegram.sendMessage(channelIdEnglish, message);
});

// 0 7 * * *
schedule.scheduleJob('0 7 * * *', async () => {
    const data = await findTodaySchedular();

    if(!data || data?.length === 0) {
        return;
    }

    let message = '📅 Lịch hôm nay:\n';
    data.forEach((item) => {
        const { start_time, end_time, name, note } = item;
        const [hour, minute] = start_time.split(':');
        message += `📌 ${name}`;
        if(start_time) {
            message += ` - Thời gian: ${start_time.split('T')[1]?.split('.')[0]}`;
        }
        if(end_time) {
            message += ` đến ${end_time.split('T')[1]?.split('.')[0]}`;
        }
        message += '\n'
    });

    bot.telegram.sendMessage(channelIdCalendar, message);

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
