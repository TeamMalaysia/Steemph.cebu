import {
    checkRegisteredUser,
    updateTime,
    registration
} from './controller/user';
import {
    upvotePost
} from './controller/upvote';



function main(msg, args, weightage) {
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
                                let text = `this post is successfully upvoted by <@416943768135139328>: ${args[0]}.
                                You are now in voting cooldown. ${config.timeAllowed /60 /60} hours left before you can request for an upvote.`
                                msg.reply(text);
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
                    /*
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
                */
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
                            let text = `I had already voted on one of your post. Please wait for
                            ${timeConvertMessage(convert(config.timeAllowed - timeDiff))}.`
                            msg.reply(text);
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

        } else {
            msg.reply('Invalid link');
        }
    } else {
        msg.reply(
            'I cannot upvote this post. I might already upvoted this post or the link is invalid. Be reminded that for me to vote : \n `$upvote (Space) URL of your post`.'
        );
    }
}

export default main;