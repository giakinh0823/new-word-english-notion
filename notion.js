const { Client } = require('@notionhq/client');
const dotenv = require('dotenv');
const { searchDictionaryEnglish } = require('./cambridge');

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const MAX_RETRIES = 3;

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

const updatePage = async (pageId, data, retries = 0) => {
    try {
        const response = await notion.pages.update({
            page_id: pageId,
            properties: {
                ...data
            },
        });
        return response;
    } catch {
        console.log("Error update page: ", pageId);
        if (retries < MAX_RETRIES) {
            console.log(`Retrying... (${retries + 1}/${MAX_RETRIES})`);
            const value = {
                "Vietnamese": {
                    "rich_text": [
                        {
                            "text": {
                                "content": "ERROR: Đã có lỗi xảy ra. Xin vui lòng thử lại!"
                            },
                            "plain_text": "ERROR: Đã có lỗi xảy ra. Xin vui lòng thử lại!",
                            "annotations": {
                                "bold": true,
                                "italic": false,
                                "strikethrough": false,
                                "underline": false,
                                "code": true,
                                "color": "red"
                            },
                        }
                    ]
                },
            }
            return updatePage(pageId, value);
        } else {
            console.error('Max retries reached. Unable to update page.');
        }
        return null;
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
    let mapWord = {};
    for (let index = 0; index < datas.results.length; index++) {
        const page = datas.results[index];
        const id = page.id;
        map[id] = index;
        if(page?.properties?.English?.title[0]?.text?.content 
            && page?.properties?.Sound?.rich_text[0]?.text?.content
            && page?.properties?.URL?.url
            && page?.properties?.Vietnamese?.rich_text[0]?.text?.content){
            mapWord[page.properties.English.title[0].text.content.toLowerCase()] = page.properties.Vietnamese.rich_text[0].text.content;
        }
    }
    
    const results = await filterNewWord(databaseId);

    if (!results || results.length == 0) {
        return;
    }

    results.forEach(async (element) => {
        const title = element?.properties?.English?.title;
        if (title && title.length > 0) {
            const word = title[0].text.content;

            if(word && word.trim() != "" && mapWord[word.trim().toLowerCase()] && mapWord[word.trim().toLowerCase()] != ""){
                console.log("Từ mới đã có sẵn: ", word)
                const value = {
                    "Vietnamese": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": "ERROR: Từ mới đã có sẵn. Xin vui lòng kiểm tra lại!"
                                },
                                "plain_text": "ERROR: Từ mới đã có sẵn. Xin vui lòng kiểm tra lại!",
                                "annotations": {
                                    "bold": true,
                                    "italic": false,
                                    "strikethrough": false,
                                    "underline": false,
                                    "code": true,
                                    "color": "orange"
                                },
                            }
                        ]
                    },
                }

                await updatePage(element.id, value);
                return;
            }

            const searchRes = await searchDictionaryEnglish(word);
            if (!searchRes || !searchRes?.type || !searchRes?.translations || !searchRes?.sound) {
                console.log("Không tìm thấy từ mới ", word)
                const value = {
                    "Vietnamese": {
                        "rich_text": [
                            {
                                "text": {
                                    "content": "ERROR: Không tìm thấy từ mới. Xin vui lòng kiểm tra lại!"
                                },
                                "plain_text": "ERROR: Không tìm thấy từ mới. Xin vui lòng kiểm tra lại!",
                                "annotations": {
                                    "bold": true,
                                    "italic": false,
                                    "strikethrough": false,
                                    "underline": false,
                                    "code": true,
                                    "color": "orange"
                                },
                            }
                        ]
                    },
                }

                await updatePage(element.id, value);
                return;
            }


            const type = searchRes?.type?.map(item => {
                return {
                    "name": item
                };
            });
            const newData = buildNewData(map[element.id] + 1, searchRes?.translations, searchRes?.sound, searchRes?.url, type); // Fix typo here
            await updatePage(element.id, newData);
        }
    });
}


const findAllNewWord = async () => {
    const databaseId = process.env.DATABASE_ID;
    const databaseRes = await getDatabase(databaseId);

    if (!databaseRes || !databaseRes?.id) {
        return;
    }

    const datas = await findAllDatabase(databaseId);
    if (!datas || !datas?.results || datas?.results?.length == 0) {
        return;
    }

    return datas.results.map(item => {
        if(!item?.properties){
            return;
        }
        console.log(item?.properties);
        const properties = item?.properties;

        if(!properties?.English?.title[0]?.plain_text || 
            !properties?.Vietnamese?.rich_text[0]?.plain_text || 
            !properties?.Sound?.rich_text[0]?.plain_text){
            return;
        }
        return {
            "english": properties.English.title[0].plain_text,
            "vietnamese": properties.Vietnamese?.rich_text[0].plain_text,
            "sound": properties.Sound.rich_text[0].plain_text,
            "type": properties?.multi_select?.map(item => item.name).join(", "),
            "url": properties?.URL?.url,
            "band": properties?.Band?.select?.name,
            "unit": properties?.Unit?.select?.name
        }
    }).filter(item => item)   
}

module.exports = { fillValuesNewWords, findAllNewWord }