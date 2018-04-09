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
          msg.reply(`current weightage is ${weightage}%`);
          break;
        case 'weightage':
          if (config.adminId.includes(currentUserId)) {
            if (args.length === 1) {
              let val = parseInt(args[0]);
              if (val > 0 && val <= 100) {
                weightage = val;
                msg.reply(
                  `updated weightage to ${weightage}%`
                );
              } else {
                msg.reply('invalid weightage %');
              }
            }
          } else {
            msg.reply(`You are not authorized to do this.`);
          }
          break;
        case 'upvote':
          if (
            args.length === 1 &&
            args[0].split(/[\/#]/).length === 6
          ) {
            let authorName = args[0].split(/[\/#]/)[4];
            let permlinkName = args[0].split(/[\/#]/)[5];
            if (
              authorName.charAt(0) === '@' &&
              !!permlinkName
            ) {
              // **************************************************
              // Check registered user
              // **************************************************
              checkRegisteredUser(currentUserId)
                .then(isRegistered => {
                  console.log(isRegistered);
                  if (isRegistered) {
                    // **************************************************
                    // Check date time
                    // **************************************************
                    return checkLastPost(
                      currentUserId
                    ).then(data => {
                      if (!!data) {
                        timeDiff = Math.floor(
                          (currentCreatedTimestamp - data) /
                            1000
                        );
                        if (timeDiff > config.timeAllowed) {
                          // Proceed
                        } else {
                          throw 'NOT_YET_TIME';
                          return;
                        }
                      }
                    });

                    console.log('registered');
                  } else {
                    console.log('not registered');
                    // **************************************************
                    // Register user
                    // **************************************************
                    return registration(
                      currentUsername,
                      currentUserId
                    )
                      .then(data => {
                        console.log(data);
                        if (data === 'DB_ERROR') {
                          throw data;
                        }
                      })
                      .catch(err => err);
                  }
                })
                .then(() => {
                  // **************************************************
                  // Upvote Post
                  // **************************************************
                  return upvotePost(
                    process.env.STEEM_POSTING,
                    process.env.STEEM_USERNAME,
                    authorName.substr(1),
                    permlinkName,
                    weightage * 100
                  )
                    .then(data => {
                      if (data === 'ERROR') {
                        throw 'NO_UPVOTE';
                      } else {
                        msg.reply(` this post is successfully upvoted by @Steemph.cebu#5291 : ${
                          args[0]
                        }.

You are now in voting cooldown. ${config.timeAllowed /
                          60 /
                          60} hours left before you can request for an upvote.`);
                        return;
                      }
                    })
                    .then(() => {
                      // **************************************************
                      // Update Date Time of the Post
                      // **************************************************
                      return updateTime(
                        currentUserId,
                        currentCreatedTimestamp
                      )
                        .then(() =>
                          console.log(`data updated`)
                        )
                        .catch(() => {
                          throw 'DB_ERROR';
                        });
                    })
                    .then(() => {
                      // **************************************************
                      // Comment on  Post
                      // **************************************************
                      return commentPost(
                        process.env.STEEM_POSTING,
                        process.env.STEEM_USERNAME,
                        authorName.substr(1),
                        permlinkName
                      );
                    });
                })
                .catch(err => {
                  console.log(err);
                  switch (err) {
                    case 'NO_UPVOTE':
                      msg.reply(
                        'I cannot upvote this post. I might already upvoted this post or the link is invalid. Be reminded that for me to vote : \n `$upvote (Space) URL of your post`.'
                      );
                      break;
                    case 'NOT_YET_TIME':
                      msg.reply(
                        `I had already voted on one of your post. Please wait for
 ${timeConvertMessage(
   convert(config.timeAllowed - timeDiff)
 )}.`
                      );
                      break;
                    case 'DB_ERROR':
                      msg.reply('Database Error');
                      break;
                    case 'NO_COMMENT':
                      msg.reply('No comment');
                      break;
                    default:
                      msg.reply('ERROR');
                      break;
                  }
                });

              break;
            } else {
              msg.reply('Invalid link');
            }
          } else {
            msg.reply(
              'I cannot upvote this post. I might already upvoted this post or the link is invalid. Be reminded that for me to vote : \n `$upvote (Space) URL of your post`.'
            );
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
