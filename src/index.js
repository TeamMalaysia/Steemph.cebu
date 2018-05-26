import * as Discord from 'discord.js';
import * as logger from 'winston';
import * as dotenv from 'dotenv';
import * as steem from 'steem';
import * as http from 'http';
import convert from 'convert-seconds';

import 'babel-polyfill';

dotenv.config();

// ============================================================
// Database
// ============================================================
import db from './db';
db();

// ============================================================
// Controller
// ============================================================
import {
  checkRegisteredUser,
  checkLastPost,
  updateTime,
  registration
} from './controller/user';
import {
  upvotePost,
  commentPost
} from './controller/upvote';

import {
  getDateTimeFromTimestamp,
  timeConvertMessage
} from './controller/util';
import admin from './admin';
import main from './user';

import config from './config.json';
import regex from './regex.json';

// ============================================================
// Start Discord
// ============================================================
let timeDiff;
const client = new Discord.Client();
let weightage = config.weightage || 10;

// ============================================================
// Discord Ready connected
// ============================================================
client.on('ready', () => {
  logger.info(`Logged in as ${client.user.tag}!`);
});

// ============================================================
// Discord Receive Message
// ============================================================

client.on('message', msg => {
  // **************************************************
  // Restricted Channel
  // **************************************************
  if (!config.channelId.includes(msg.channel.id)) {
    return;
  } else {
    // **************************************************
    // Get information about the message
    // **************************************************

    let {
      id: currentMessageId,
      author: {
        username: currentUsername,
        id: currentUserId
      },
      content: currentContent,
      createdTimestamp: currentCreatedTimestamp
    } = msg;

    logger.info(currentContent);

    // **************************************************
    // Check for Bot message
    // **************************************************

    if (currentUserId === config.botId) {
      return;
    }
    // **************************************************
    // Check for Admin
    // **************************************************

    if (msg.channel.id === config.mahaloChannel) {
      // MAHALO
      admin(
        msg,
        process.env.MAHALO,
        process.env.MAHALO_POSTING
      );
      return;
    } else if (msg.channel.id === config.bayanihanChannel) {
      // BAYANI
      admin(
        msg,
        process.env.BAYANIHAN,
        process.env.BAYANIHAN_POSTING
      );
    }
    // **************************************************
    // Check for trigger
    // **************************************************

    if (currentContent.substring(0, 1) == config.trigger) {
      let args = msg.content.substring(1).split(' ');
      const cmd = args[0];
      args = args.splice(1);
      switch (cmd) {
        case 'info':
          msg.reply(`current weightage is ${weightage/100}%`);
          break;
          //      case 'weightage':
          //        if (config.adminId.includes(currentUserId)) {
          //          if (args.length === 1) {
          //            let val = parseInt(args[0]);
          //            if (val > 0 && val <= 100) {
          //              weightage = val;
          //              msg.reply(
          //                `updated weightage to ${weightage}%`
          //              );
          //            } else {
          //              msg.reply('invalid weightage %');
          //            }
          //          }
          //        } else {
          //          msg.reply(`You are not authorized to do this.`);
          //        }
          //        break;
        case 'upvote':
          const SP500 = '446649158976274452';
          const SP400 = '446649226118823936';
          const SP300 = '446649351352352768';
          const SP200 = '446649427935887360';
          const SP100 = '446649501252452354';
          const SP50 = '446649546529832961';
          const SP20 = '446649600426770455';
          const SP0 = '446649667812458496';
          switch (msg.channel.id) {
            case SP500:
              user(msg, args, 65)
              break
            case SP400:
              user(msg, args, 55)
              break
            case SP300:
              user(msg, args, 45)
              break
            case SP200:
              user(msg, args, 35)
              break
            case SP100:
              user(msg, args, 25)
              break
            case SP50:
              user(msg, args, 17)
              break
            case SP20:
              user(msg, args, 10)
              break
            case SP0:
              user(msg, args, 5)
              break
          }
          break;
        case 'help':
          msg.reply(`
            \`${
              config.trigger
            }upvote\ <steemit link>\` to get your post upvoted.
            \`${
              config.trigger
            }help\` to get help on getting started`);
          break;
        default:
          msg.reply(
            `Type \`${config.trigger}help\` to get started`
          );
          break;
      }
    }
  }
}); // Start Discord Server // ============================================================

// ============================================================
client.login(process.env.DISCORD_TOKEN); // Start server