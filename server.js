
// const axios = require('axios');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config()

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});



const openai = new OpenAIApi(configuration);

const messagesSent = new Set();



async function run() {

    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { headless: false },
        rateLimit: {
            delay: 500, // delay between each message, in milliseconds
            maxInProgress: 3, // maximum number of messages that can be in progress at the same time
        },
    });

    client.initialize();

    client.on('loading_screen', (percent, message) => {
        console.log('LOADING SCREEN', percent, message);
    });

    client.on('qr', (qr) => {
        // NOTE: This event will not be fired if a session is specified.
        console.log('QR RECEIVED', qr);
    });

    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
    });

    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessful
        console.error('AUTHENTICATION FAILURE', msg);
    });

    client.on('ready', () => {
        console.log('READY');
    });

    client.on('message', async msg => {
        console.log('MESSAGE RECEIVED', msg);

        console.log('MESSAGE RECEIVED body', msg.body);

        if (msg.body === '!ping reply') {
            // Send a new message as a reply to the current one
            msg.reply('pong');

        } else if (msg.body === '!mediainfo' && msg.hasMedia) {
            // const attachmentData = await msg.downloadMedia();
            // msg.reply(`
            //     *Media info*
            //     MimeType: ${attachmentData.mimetype}
            //     Filename: ${attachmentData.filename}
            //     Data (length): ${attachmentData.data.length}
            // `);
        } else if (msg.hasQuotedMsg) {
            // const quotedMsg = await msg.getQuotedMessage();

            // quotedMsg.reply(`
            //     ID: ${quotedMsg.id._serialized}
            //     Type: ${quotedMsg.type}
            //     Author: ${quotedMsg.author || quotedMsg.from}
            //     Timestamp: ${quotedMsg.timestamp}
            //     Has Media? ${quotedMsg.hasMedia}
            // `);
        } else if (msg.body === '!reaction') {
            msg.react('👍');
        }

        else if (msg.body !== '') {
            // const chat = await msg.getChat();
            // chat.sendMessage('Hello World');

            // Use the OpenAI API to generate a response
            const response = await generateResponse(msg.body);

            // client.sendMessage(msg.from, response);
            // console.log(`Response sent to ${msg.from}: ${response}`);

            // Introduce a human-like delay before sending the response
            setTimeout(() => {

                // Avoid sending repetitive or spammy messages
                if (!messagesSent.has(response)) {
                    client.sendMessage(msg.from, response);
                    console.log(`Response sent to ${msg.from}: ${response}`);
                    messagesSent.add(response);
                }
            }, Math.random() * 3000 + 1000);
        }
    });

    client.on('message_create', (msg) => {
        // Fired on all message creations, including your own
        if (msg.fromMe) {
            // do stuff here
        }
    });







    client.on('disconnected', (reason) => {
        console.log('Client was logged out', reason);
    });


}

async function generateResponse(prompt) {


    // Use the OpenAI API to generate a response based on the prompt
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `${prompt}`,
        stream: false, // disable streaming mode
        stop: ".", // stop generating tokens when a period is encountered
        temperature: 0.5, // Higher values means the model will take more risks.
        max_tokens: 256, // The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).
        top_p: 1, // alternative to sampling with temperature, called nucleus sampling
        frequency_penalty: 0.5, // Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
        presence_penalty: 0, // Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
    });

    return response.data.choices[0].text;
}

run();
