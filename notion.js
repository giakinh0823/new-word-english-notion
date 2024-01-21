const { Client } = require('@notionhq/client');
const dotenv = require('dotenv');
const { searchDictionaryEnglish } = require('./cambridge');

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const getDatabase = async (databaseId) => {
    try {
        return response = await notion.databases.retrieve({ database_id: databaseId });
    } catch {
        console.log("Not found database: ", databaseId);
        return null;
    }
}

const findAllDatabase = async (databaseId) => {
    try {
        const payload = {
            database_id: databaseId,
            sorts: [
                {
                    property: 'Created Time',
                    direction: 'ascending',
                },
            ]
        }
        const response = await notion.databases.query(payload);
        return response;
    } catch {
        console.log("error find all database: ", databaseId);
        return null;
    }
}

const filterDatabase = async (databaseId, query, sort) => {
    try {
        const payload = {
            database_id: databaseId,
            filter: {
                ...query
            },
            sort: [
                ...sort
            ]
        }
        const response = await notion.databases.query(payload);
        return response;
    } catch {
        console.log("error query database: ", databaseId, query);
        return null;
    }
}

const updatePage = async (pageId, data) => {
    try {
        const response = await notion.pages.update({
            page_id: pageId,
            properties: {
                ...data
            },
        });
        return response;
    } catch {
        console.log("error update page: ", pageId, data);
    }
}

const filterNewWord = async (databaseId) => {
    const query = {
        "and": [
            {
                "property": "English",
                "rich_text": {
                    "is_not_empty": true
                }
            },
            {
                "or": [
                    {
                        "property": "Sound",
                        "rich_text": {
                            "is_empty": true
                        }
                    },
                    {
                        "property": "Vietnamese",
                        "rich_text": {
                            "is_empty": true
                        }
                    },
                    {
                        "property": "Type",
                        "multi_select": {
                            "is_empty": true
                        }
                    },
                    {
                        "property": "URL",
                        "rich_text": {
                            "is_empty": true
                        }
                    }
                ]
            }
        ]
    }

    const sorts = [
        {
            property: 'Created Time',
            direction: 'ascending',
        },
    ];

    const queryRes = await filterDatabase(databaseId, query, sorts);
    if (!queryRes || !queryRes?.results) {
        return [];
    }
    return queryRes.results;
}

const buildNewData = (stt, vietnamese, sound, url, type) => {
    let value = {
        "Band": {
            "select": {
                "name": process.env.BAND
            }
        }
    };
    if (stt) {
        value = {
            ...value,
            "STT": {
                "number": stt
            }
        }
    }
    if (vietnamese) {
        value = {
            ...value,
            "Vietnamese": {
                "rich_text": [
                    {
                        "text": {
                            "content": vietnamese
                        },
                        "plain_text": vietnamese
                    }
                ]
            },
        }
    }

    if (sound) {
        value = {
            ...value,
            "Sound": {
                "rich_text": [
                    {
                        "text": {
                            "content": sound
                        },
                        "plain_text": sound
                    }
                ]
            },
        }
    }

    if (url) {
        value = {
            ...value,
            "URL": {
                "url": url
            },
        }
    }

    if (type) {
        value = {
            ...value,
            "Type": {
                "multi_select": type
            },
        }
    }

    return value;
}

const fillValuesNewWords = async () => {
    const databaseId = process.env.DATABASE_ID;
    const databaseRes = await getDatabase(databaseId);

    if (!databaseRes || !databaseRes?.id) {
        return;
    }

    const datas = await findAllDatabase(databaseId);
    if (!datas || !datas?.results || datas?.results?.length == 0) {
        return;
    }

    let map = {};
    for (let index = 0; index < datas.results.length; index++) {
        const page = datas.results[index];
        const id = page.id;
        map[id] = index;
    }

    const results = await filterNewWord(databaseId);

    if (!results || results.length == 0) {
        return;
    }

    results.forEach(async (element) => {
        const title = element?.properties?.English?.title;
        if (title && title.length > 0) {
            const word = title[0].text.content;
            console.log("Start update word: ", word);
            const searchRes = await searchDictionaryEnglish(word);
            if (!searchRes) {
                return;
            }
            const type = searchRes?.type?.map(item => {
                return {
                    "name": item
                };
            });
            const newData = buildNewData(map[element.id] + 1, searchRes?.translations, searchRes?.sound, searchRes?.url, type); // Fix typo here
            console.log(newData);
            updatePage(element.id, newData);
        }
    });
}

module.exports = { fillValuesNewWords }