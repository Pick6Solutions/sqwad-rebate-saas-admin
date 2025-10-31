import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";

import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from "firebase-admin/database";

import {request as httpsRequest, request} from 'https';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';

import { dirname } from 'path';
import { fileURLToPath } from "url";

import {
    randomInt,
    shuffleArray
} from "./utils/usefulFunctions.js";
import {getAuth} from "firebase-admin/auth";

// ----------------------------------------------------------------------
// ESM __filename & __dirname setup
// ----------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----------------------------------------------------------------------
// Loading environment values
// ----------------------------------------------------------------------
let valuesFromEnvFile = {};
if (process.env.CLOUD_RUNTIME_CONFIG && typeof process.env.CLOUD_RUNTIME_CONFIG === 'string') {
    const jsonConfig = JSON.parse(process.env.CLOUD_RUNTIME_CONFIG);
    valuesFromEnvFile = jsonConfig.env || {};
}

let databaseUrl;
let storageBucketUrl = process.env.GCLOUD_PROJECT + ".appspot.com";
let tag = process.env.GCLOUD_PROJECT;
const COMMON_PASS = "8501c9f022fd9ca5ec68#{$}";

if (process.env.FUNCTIONS_EMULATOR) {
    tag = "";
    const jsonConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    databaseUrl = jsonConfig.databaseURL;
    // If you have a custom getStorageUrl, call it here:
    // storageBucketUrl = getStorageUrl(process.env.FIREBASE_CONFIG);
} else if (valuesFromEnvFile['react_app_firebase_database']) {
    databaseUrl = valuesFromEnvFile['react_app_firebase_database'];
} else if (process.env.FIREBASE_CONFIG && typeof process.env.FIREBASE_CONFIG === 'string') {
    const jsonConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    databaseUrl = jsonConfig.databaseURL;
} else {
    console.log("NO DB URL!!!!!!!!!!!!!!!!");
}

// ----------------------------------------------------------------------
// Initialize Firebase Admin
// ----------------------------------------------------------------------
const appSetUp = initializeApp({ databaseURL: databaseUrl });
const db = getDatabase(appSetUp);

logger.log("databaseUrl:", databaseUrl);
logger.log("StorageUrl:", storageBucketUrl);
logger.log(valuesFromEnvFile['react_app_mlb_team_id']);

// ----------------------------------------------------------------------
// Express App
// ----------------------------------------------------------------------
const app = express();
const TEMPLATEID = "TopicUpdate";
const FIREBASE_BATCH_SIZE = 500;
const corsMiddleware = cors({ origin: true });

app.use(express.static(__dirname + "/js"));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(corsMiddleware);
app.use(cookieParser());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    next();
});

// ----------------------------------------------------------------------
// Helper to convert timestamps
// ----------------------------------------------------------------------
function returnTimeStampInMilliseconds(timeStamp) {
    if (!timeStamp) return timeStamp;

    let stringTimeStampLength = 0;
    if (typeof timeStamp !== "string") {
        stringTimeStampLength = timeStamp.toString().length;
    } else {
        stringTimeStampLength = timeStamp.length;
        timeStamp = parseInt(timeStamp);
    }

    // If less than 13 digits, assume seconds => convert to ms
    if (stringTimeStampLength < 13) {
        return timeStamp * 1000;
    } else {
        return timeStamp;
    }
}

// ----------------------------------------------------------------------
// DB Helpers
// ----------------------------------------------------------------------
function getSnapshotFromEndpoint(endpoint) {
    return db.ref(endpoint).once('value').then(function (snapshot) {
        return snapshot;
    });
}

async function markGameCompleted(location, freezeInsteadOfStop = false) {
    await db.ref(`currentGame/${location}/status`).set("completed");
    if (freezeInsteadOfStop) {
        await db.ref(`currentGame/status`).set(1);
    } else {
        await db.ref('currentGame/active').set(false);
    }
}

// ----------------------------------------------------------------------
// SCHEDULED TRIGGER
// ----------------------------------------------------------------------
export const remoteScheduledCheck = onSchedule(
    {
        memory: '2GiB',
        schedule: '* * * * *'
    },
    async (event) => {
        // Just use Date for a quick timestamp
        const now = new Date();

        // Example: get some DB data
        const promisesArray = await Promise.all([
            getSnapshotFromEndpoint(`currentGame/scheduleInfo`),
            getSnapshotFromEndpoint(`currentGame/activateGame`)
        ]);

        const currentGameScheduleInfo = promisesArray[0].exists() ? promisesArray[0].val() : null;
        const currentGameActivate = promisesArray[1].exists() ? promisesArray[1].val() : null;

        let scheduleDate;
        let location;
        if (!currentGameScheduleInfo && !currentGameActivate) {
            logger.log("No Schedule");
            return;
        } else if (currentGameScheduleInfo) {
            scheduleDate = currentGameScheduleInfo;
            location = "scheduleInfo";
        } else {
            scheduleDate = currentGameActivate;
            location = "activateGame";
        }

        let { performAt, status, endAt } = scheduleDate;
        performAt = returnTimeStampInMilliseconds(performAt);
        endAt = returnTimeStampInMilliseconds(endAt);

        logger.log("PerformAt:", performAt, "Status:", status, "EndAt:", endAt, "Now:", now.getTime());

        if (status === "scheduled" && performAt <= now.getTime()) {
            await db.ref(`currentGame/${location}/status`).set("active");
            await db.ref('currentGame/active').set(true);
            await db.ref('currentGame/firstStart').set(true);
            await db.ref('currentGame/timeStamp').set(now.getTime());
        } else if (status === "active" && endAt <= now.getTime()) {
            await markGameCompleted(location, true);
        }
    }
);

// ----------------------------------------------------------------------
// HTTPS TRIGGER
// --------------------------------------
app.post('/sendRewardsToFans', async (req, res) => {
        const checkIfAdminResponse = await checkIfAdminMiddleWare(req);
        if(!checkIfAdminResponse.success) return res.status(401).json({error: checkIfAdminResponse.error})
        if (req.body.rewardsLevels) {
            await organizeRewardsLevels(req.body.rewardsLevels, req.body.currentGameUserAnswers, req.body.tenantVariables, res);
        } else {
            res.json({ result: 'finished' });
        }
    }
);

async function organizeRewardsLevels(rewardsLevels, userAnswersArray, variables, res) {
    const emailsSent = await db.ref('emailsSent').once('value').then(function (emailsSentSnapshot) {
        return emailsSentSnapshot.val();
    });
    if (emailsSent) {
        logger.log("Block Second Send Event");
        if (res) {
            res.json({ result: 'finished' });
        }
        return;
    }

    let prizeWon = {};
    const allLevelsToSend = [];
    let randomOrder = false;
    if (rewardsLevels.randomizeUserAnswerLevel) {
        randomOrder = true;
    }

    userAnswersArray = shuffleArray(userAnswersArray);
    let cmp = (a, b) => (a > b) - (a < b);

    // order by correct answers
    userAnswersArray.sort(function (a, b) {
        return cmp(b.correctAnswers, a.correctAnswers) || (randomOrder && cmp(a.timeStamp, b.timeStamp));
    });
    // order reward levels by amount needed to earn
    rewardsLevels.sort(function (a, b) {
        return cmp(b.answerLevel, a.answerLevel);
    });

    for (const userAnswerIndex in userAnswersArray) {
        const userThatWeAreIterating = userAnswersArray[userAnswerIndex] || {};
        const getId = userThatWeAreIterating.email ? btoa(userThatWeAreIterating.email) : userThatWeAreIterating.uid
        prizeWon[userThatWeAreIterating.email ? btoa(userThatWeAreIterating.email) : userThatWeAreIterating.uid] = false;
    }

    let currentUserToCheckIndex = 0;
    for (const rewardLevelIndex in rewardsLevels) {
        const rewardLevel = rewardsLevels[rewardLevelIndex];
        const rewardLevelRewards = [];

        for (const rewardIndex in rewardLevel) {
            const reward = rewardLevel[rewardIndex];
            if (typeof reward === "object") {
                rewardLevelRewards.push(reward);
            }
        }

        // put allElsePrize last
        rewardLevelRewards.sort(function (a, b) {
            return (a.allElsePrize === b.allElsePrize) ? 0 : a.allElsePrize ? 1 : -1;
        });

        const prizesDistributed = cycleLevelRewards(
            rewardLevelRewards,
            userAnswersArray,
            rewardLevel.answerLevel,
            currentUserToCheckIndex,
            prizeWon,
            rewardLevel.totalRewards,
            variables,
            rewardLevel.randomPrizeOrder
        );

        prizeWon = prizesDistributed.prizeWon;
        allLevelsToSend.push(prizesDistributed.recipients);
        currentUserToCheckIndex = prizesDistributed.keepRotatingIndex;
    }

    await db.ref('prizeWon').set(prizeWon);

    // Send out the emails
    for (const allLevelsIndex in allLevelsToSend) {
        const levelToSend = allLevelsToSend[allLevelsIndex];
        for (const levelToSendIndex in levelToSend) {
            const recipients_with_prize = levelToSend[levelToSendIndex];
            if (recipients_with_prize.recipients.length > 0) {
                await sendMultipleWinningEmailsAtOnce(
                    recipients_with_prize.recipients,
                    recipients_with_prize.reward,
                    recipients_with_prize.recipients_name
                );
            }
        }
    }
    if (res) {
        res.json({ result: 'finished' });
    }
}

function cycleLevelRewards(
    rewardLevelRewards,
    userAnswersArray,
    numberCorrect,
    currentUserToCheckIndex,
    prizeWon,
    rewardNumberOfRewards,
    variables,
    randomPrizeOrder
) {
    const emails_in_array = [];
    const rewardsWon = {};
    let keepRotatingIndex = currentUserToCheckIndex || 0;
    let allElsePrize = false;

    if (
        rewardLevelRewards.length > 0 &&
        rewardLevelRewards[rewardLevelRewards.length - 1] &&
        rewardLevelRewards[rewardLevelRewards.length - 1].allElsePrize
    ) {
        allElsePrize = rewardLevelRewards[rewardLevelRewards.length - 1];
    }

    let rewardAmountLeftToGive = rewardNumberOfRewards;
    const threshold = numberCorrect;
    let keepRotating = true;

    while (keepRotating) {
        const currentAnswer = userAnswersArray[keepRotatingIndex];
        let rewardToGiveInt = randomInt(1, rewardAmountLeftToGive);

        if (!randomPrizeOrder) {
            rewardToGiveInt = 1;
        }

        let currentNumber = 0;
        let rewardFound = false;

        if (rewardAmountLeftToGive > 0) {
            for (const rewardLevelRewardIndex in rewardLevelRewards) {
                const reward = rewardLevelRewards[rewardLevelRewardIndex];
                const rewardId = reward.id || reward.key;
                const numberLeft = reward.amount - reward.used;

                if (
                    rewardToGiveInt <= numberLeft + currentNumber &&
                    !rewardFound &&
                    currentAnswer &&
                    !reward.allElsePrize &&
                    numberLeft > 0
                ) {
                    // Threshold check
                    if (
                        parseInt(threshold) === parseInt(currentAnswer.correctAnswers) &&
                        !reward.allElsePrize
                    ) {
                        if (emails_in_array.indexOf(currentAnswer.email) === -1 && rewardId) {
                            rewardLevelRewards[rewardLevelRewardIndex].used += 1;
                            emails_in_array.push(currentAnswer.email);

                            if (!rewardsWon[rewardId]) {
                                rewardsWon[rewardId] = {
                                    reward: Object.assign({}, reward),
                                    recipients: [],
                                    recipients_name: []
                                };
                            }
                            rewardsWon[rewardId].recipients.push(currentAnswer.email);
                            if (variables.collectName && variables.nameInEmail) {
                                rewardsWon[rewardId].recipients_name.push(currentAnswer.name);
                            }

                            prizeWon[btoa(currentAnswer.email)] = true;
                            rewardAmountLeftToGive--;
                        }
                        rewardFound = true;
                        keepRotatingIndex++;

                        if (randomPrizeOrder) {
                            rewardToGiveInt = Math.floor(Math.random() * rewardAmountLeftToGive);
                        }
                    } else if (
                        parseInt(threshold) < parseInt(currentAnswer.correctAnswers) &&
                        !reward.allElsePrize
                    ) {
                        keepRotatingIndex++;
                        break; // skip to next user if they exceed threshold
                    } else {
                        keepRotating = false;
                    }
                } else if (!currentAnswer) {
                    keepRotating = false;
                } else {
                    currentNumber += numberLeft;
                }
            }
        } else if (
            currentAnswer &&
            allElsePrize &&
            parseInt(threshold) === parseInt(currentAnswer.correctAnswers) &&
            rewardAmountLeftToGive <= 0
        ) {
            const allElsePrizeId = allElsePrize.id || allElsePrize.key;
            if (emails_in_array.indexOf(currentAnswer.email) === -1 && allElsePrizeId) {
                emails_in_array.push(currentAnswer.email);

                if (!rewardsWon[allElsePrizeId]) {
                    rewardsWon[allElsePrizeId] = {
                        reward: Object.assign({}, allElsePrize),
                        recipients: [],
                        recipients_name: []
                    };
                }
                rewardsWon[allElsePrizeId].recipients.push(currentAnswer.email);
                if (variables.collectName && variables.nameInEmail) {
                    rewardsWon[allElsePrizeId].recipients_name.push(currentAnswer.name);
                }

                prizeWon[btoa(currentAnswer.email)] = true;
            }
            keepRotatingIndex++;
        } else if (
            currentAnswer &&
            allElsePrize &&
            parseInt(threshold) < parseInt(currentAnswer.correctAnswers) &&
            rewardAmountLeftToGive <= 0
        ) {
            keepRotatingIndex++;
        } else {
            keepRotating = false;
        }
    }

    return {
        recipients: rewardsWon,
        prizeWon: prizeWon,
        keepRotatingIndex: keepRotatingIndex
    };
}

// ----------------------------------------------------------------------
// Sending Emails
// ----------------------------------------------------------------------
async function sendMultipleWinningEmailsAtOnce(recipients, reward, recipients_name, useNewEmail = false, isLosing = false) {
    const emailVariables = await db.ref('emailVariables').once('value').then(function (snapshot) {
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return [];
        }
    });

    const from_who = emailVariables.sender || "rewards@sqwadapp.co";
    let subject = emailVariables.subjectLine || "Here is your prize";
    let replyTo = emailVariables.replyTo;
    let email_help_text = emailVariables.helpText;
    let header_image = emailVariables.emailBackgroundImage;

    const reward_link = reward.rewardLink;
    const description = reward.description;
    const codes = reward.codesArray;
    let convertToQRCodes;
    if (reward.qrCodes) {
        convertToQRCodes = true;
    }
    const pins = reward.pinsArray;
    const links = reward.linksArray;

    const reward_name = useNewEmail ? (reward.rewardDisplayName || "") : reward.rewardName;
    const reward_image = reward.emailImage;
    const level_text = reward.number_correct_message;
    const rewardLinkButtonColor = reward.rewardLinkButtonColor;
    const rewardLinkButtonTextColor = reward.rewardLinkButtonTextColor;
    const rewardLinkButtonText = reward.rewardLinkButtonText;

    if (isLosing) {
        subject = emailVariables.loserSubjectLine || "Thanks for playing!";
        email_help_text = emailVariables.losingHelpText;
        header_image = emailVariables.losingEmailImage;
    }

    const gameObject = {
        from_who,
        subject,
        recipients,
        recipients_names: recipients_name,
        reward_link,
        rewardLinkButtonColor,
        rewardLinkButtonTextColor,
        header_image,
        description,
        rewardLinkButtonText,
        codes,
        reward_name,
        reward_image,
        level_text,
        preview: emailVariables.preview,
        email_help_text,
        links,
        pins,
        qrCodes: convertToQRCodes,
        tag,
        showButton: reward.showButton,
        replyTo
    };

    const options = {
        hostname: 'still-fjord-64720.herokuapp.com',
        path: '/rewards/newTemplateEmail',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'idtoken': COMMON_PASS
        }
    };

    const response = await new Promise((resolve, reject) => {
        const req = request(options, (res) => {
            let body = '';
            res.on('data', (d) => {
                body += d;
            });
            res.on('end', () => {
                resolve(body);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify(gameObject));
        req.end();
    });
    if (response) {
        const gameToSave = {};
        const bodyResponse = JSON.parse(response) || {};
        const response_recipients = bodyResponse.recipients;
        const response_codes = bodyResponse.codes;
        const response_links = bodyResponse.links;
        for (const recipeient_index in response_recipients) {
            const rewardToSave = {};
            rewardToSave.name = reward.rewardName;
            let codeSent = false;
            let linkSent = false;

            if (response_codes) {
                codeSent = response_codes[recipeient_index];
                rewardToSave.code = codeSent;
            }
            if (response_links) {
                linkSent = response_links[recipeient_index];
                rewardToSave.link = linkSent;
            }

            const email = response_recipients[recipeient_index];
            if (email) {
                const baseEncodedEmail = btoa(email);
                gameToSave[baseEncodedEmail] = rewardToSave;
            }
        }
        await db.ref('emailsSent').update(gameToSave);
    }
}

async function checkIfAdminMiddleWare(req){
    //Get Token
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return {error: 'You are not authorized to perform this action -- token error'};
    //Check token auth
    try {
        const fireStoreAuth = getAuth();
        const decodedIdToken = await fireStoreAuth.verifyIdToken(idToken);
        if (decodedIdToken && decodedIdToken.uid) {
            const user = await fireStoreAuth.getUser(decodedIdToken.uid);
            if (!user) {
                return {error: 'You are not authorized to perform this action --- no user'};
            } else {
                return {success: true, user: user };
            }

        }
    } catch (error) {
        return {error: 'You are not authorized to perform this action -- unknown'};
    }
}

// ----------------------------------------------------------------------
// EXPRESS APP EXPORTED AS HTTP TRIGGER
// ----------------------------------------------------------------------
export const api = onRequest(
    {
        memory: '2GiB'
    },
    app
);
