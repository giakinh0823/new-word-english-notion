const cheerio = require('cheerio');

const MAX_RETRIES = 5;

const searchDictionaryEnglish = async (word, retries = 0) => {
    try {
        if (!word) {
            return;
        }
        console.log(word);
        const url = `https://dictionary.cambridge.org/vi/dictionary/english-vietnamese/${word}?q=${word}`
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.text();
        const html = data;

        const $ = cheerio.load(html);
        const sound = $('.ipa.dipa').first().text();
        const type = $('.pos.dpos').first().text();
        const translationsList = $(".trans.dtrans").map(function() {
            return $(this).text();
        }).get();

        const translations = translationsList.join(', ');

        return {
            "sound": sound,
            "url": url,
            "type": type.split(" "),
            "translations": translations
        }
    } catch (error) {
        console.error('Error:', error);
        if (retries < MAX_RETRIES) {
            console.log(`Retrying... (${retries + 1}/${MAX_RETRIES})`);
            return searchDictionaryEnglish(word, retries + 1);
        } else {
            console.error('Max retries reached. Unable to fetch data.');
        }
    }
}

module.exports = { searchDictionaryEnglish }