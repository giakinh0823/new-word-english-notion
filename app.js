const express = require('express');
const schedule = require('node-schedule');
const { fillValuesNewWords } = require('./notion');
const { bot } = require('./telegram');

const app = express();

const port = 8080; // Cổng mà API sẽ lắng nghe

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



schedule.scheduleJob('*/10 * * * * *', async () => {
    console.log('Scheduled task running...');
    try {
        await fillValuesNewWords();
    } catch (error) {
        console.error('Error in scheduled task:', error);
    }
    console.log('Scheduled task done...');
});

app.get('/', (req, res) => {
    res.send('Hà Gia Kính');
});


app.listen(port, () => {
    console.log(`API đang chạy tại http://localhost:${port}`);
});

bot.launch();
