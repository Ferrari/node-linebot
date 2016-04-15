messengerbot
=======

[![NPM](https://nodei.co/npm/messengerbot.png?mini=true)](https://nodei.co/npm/messengerbot/)

## Install

```sh
npm install --save messengerbot
```

## Usage

```javascript
const FbBot = require('messengerbot');
const bot = new FbBot({
  pageAccessToken: 'xxxxxxx',
  verifyToken: 'xxxxxx'
});

bot.on('message', (res) => {
  bot.postText({
    user: res.sender,
    message: res.message
  });
});

bot.on('error', (err) => {
    // handle error
});

bot.listen(3000);
```
