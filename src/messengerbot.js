/**
 * @external { EventEmitter } https://nodejs.org/api/events.html
 */
import { EventEmitter } from 'events';
import axios from 'axios';
import Express from 'express';
import bodyParser from 'body-parser';
import Debug from 'debug';

const debug = Debug('messengerbot');

/**
 * FB Messenger Bot API wrapper.
 *
 * @example <caption>EventEmitter</caption>
 * const FbBot = require('messengerbot');
 * const bot = new FbBot(configs);
 *
 * bot.on('message', (result) => {
 *   console.log('You got a message!', result.message);
 * });
 *
 * bot.listen(3000);
 *
 * @extends { EventEmitter }
 * @see https://developers.facebook.com/docs/messenger-platform
 */
class MessengerBot extends EventEmitter {
  /**
   * Constructor
   * @param  { Object } params
   * @param  { string } params.pageAccessToken  Page Access Token
   * @param  { string } params.verifyToken      Verify Token
   */
  constructor ({ pageAccessToken, verifyToken }) {
    super();
    this._init({ pageAccessToken, verifyToken });
  }

  /** @private */
  _init ({ pageAccessToken, verifyToken }) {
    /**
     * Configuration.
     * @type     { Object }
     * @property { string } params.pageAccessToken  Page Access Token
     * @property { string } params.verifyToken      Verify Token
     */
    this.botConfig = {
      pageAccessToken: pageAccessToken,
      verifyToken: verifyToken
    };
    debug('botConfig', pageAccessToken, verifyToken);
    Object.freeze(this.botConfig);

    /** @private */
    this._fetcher = axios.create({
      baseURL: 'https://graph.facebook.com/v2.6/',
      params: {
        access_token: this.botConfig.pageAccessToken
      }
    });

    /** @private */
    this._express = Express();

    this._express.use(bodyParser.raw({ type: '*/*' }));

    this._express.use((req, res, next) => {
      if (req.method === 'GET') {
        debug('FB Messenger webhook verify', req.query);
        const isValid = (this.botConfig.verifyToken === req.query['hub.verify_token']);
        return (isValid) ? res.send(req.query['hub.challenge']) : res.send('Error');
      }
      next();
    });

    this._express.use((req, res, next) => {
      Promise.resolve(req.body.toString('utf8'))
        .then(JSON.parse)
        .then((json) => {
          req.json = json;
          debug('input message', json);
        })
        .then(next).catch(next);
    });

    this._express.all('*', (req, res, next) => {
      if (req.json && req.json.entry[0] && req.json.entry[0].messaging) {
        this.emit('receive', req.json.entry[0].messaging);
        for (let result of req.json.entry[0].messaging) {
          if (result.message.text) {
            this.emit('message', {
              sender: result.sender,
              message: result.message.text,
              raw: result
            });
          }
        }
      }
      res.sendStatus(200);
      next();
    });

    this._express.use(function(err, req, res, next) {
      debug('ERROR', err);
      this.emit('error', err);
      res.sendStatus(400);
      next();
    });
  }

  /**
   * Post text.
   * @see https://developers.facebook.com/docs/messenger-platform/webhook-reference#message_delivery
   * @param  { Object }         params
   * @param  { string }         params.user     ID of user you send to.
   * @param  { string }         params.message  Message you send.
   * @return { Promise }
   */
  postText ({ user, message }) {
    return this._fetcher.post('me/messages', {
      recipient: user,
      message: {
        text: message
      }
    }).catch((err) => {
      console.error(err.stack);
      return Promise.reject(err);
    });
  }

  /**
   * Binds and listens for connections on the specified host and port.
   * @see http://expressjs.com/en/4x/api.html#app.listen
   * @param { ...any }  params  http://expressjs.com/en/4x/api.html#app.listen
   */
  listen (...params) {
    this._express.listen(...params);
  }

  /**
   * Adds the listener function to the end of the listeners array for the event named eventName.
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   * @param  { ...any } params   https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   * @listens { message }        Listen message. https://developers.facebook.com/docs/messenger-platform/webhook-reference#received_message
   */
  on (...params) {
    super.on(...params);
  }

}

export default MessengerBot;
