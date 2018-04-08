import { upvotePost } from './controller/upvote';

let admin = async msg => {
  let { content } = msg;
  let contentData = content.split(' ');

  let weightage = parseInt(contentData[0]);
  if (weightage > 0 && weightage <= 100) {
    if (contentData.length < 2) {
      return;
    }
    let authorName, permlinkName;
    try {
      authorName = contentData[1]
        .split(/[\/#]/)[4]
        .substr(1);
      permlinkName = contentData[1].split(/[\/#]/)[5];
    } catch (e) {
      msg.reply('invalid link');
      return;
    }
    return upvotePost(
      process.env.STEEM_POSTING,
      process.env.STEEM_USERNAME,
      authorName,
      permlinkName,
      weightage
    ).then(data => {
      if (data !== 'ERROR') {
        msg.reply('upvoted');
      } else {
        msg.reply('unable to upvote');
      }
    });
  } else {
    return;
  }
};

export default admin;
