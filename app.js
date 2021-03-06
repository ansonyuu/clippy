const { App } = require("@slack/bolt")
const AirtablePlus = require('airtable-plus')
const axios = require('axios')

const { hasPushedButton, hasCompletedTutorial, getIslandId,
  sendEphemeralMessage, updateInteractiveMessage, sendSingleBlockMessage,
  startTutorial, isBot, setFlow } = require('./utils/utils')

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN
});

// Load all files in the "/flows" folder
const normalizedPath = require("path").join(__dirname, "flows");
require("fs").readdirSync(normalizedPath).forEach(function (file) {
  require("./flows/" + file).loadFlow(app);
});

app.event('team_join', async body => {
  await startTutorial(app, body.event.user.id, 'default')
  // const bot = await isBot(app, body.event.user.id)
  // if (bot) {
  //   return
  // }

  // let userProfile = await app.client.users.info({
  //   token: process.env.SLACK_BOT_TOKEN,
  //   user: body.event.user.id
  // })

  // console.log(userProfile)

  // const somOptions = {
  //   maxRecords: 1,
  //   filterByFormula: `Email = '${userProfile.user.profile.email}'`
  // }

  // let somData = await axios(`https://api2.hackclub.com/v0.1/Pre-register/Applications?authKey=${process.env.AIRTABLE_API_KEY}&select=${JSON.stringify(somOptions)}&meta=true`).then(r => r.data)

  // console.log(somData)

  // if (somData.response[0] == null) {
  //   await startTutorial(app, body.event.user.id, 'default')
  // } else {
  //   await startTutorial(app, body.event.user.id, 'som')
  // }
});

app.command('/restart', async ({ command, ack }) => {
  await ack()
  if (command.text === '') {
    await setFlow(command.user_id, 'Default')
    await startTutorial(app, command.user_id, 'default', true)
  } else if (command.text === 'som') {
    await setFlow(command.user_id, 'Summer of Making')
    await startTutorial(app, command.user_id, 'som', true)
  }
})

app.event('message', async body => {
  if (body.message.subtype === 'channel_join' &&
    body.message.text === `<@${body.message.user}> has joined the channel`) {
    await app.client.chat.delete({
      token: process.env.SLACK_OAUTH_TOKEN,
      channel: body.message.channel,
      ts: body.message.event_ts
    })
  }
})

app.action('mimmiggie', async ({ ack, body }) => {
  ack();
});

// botInstance.action('leave_channel', replyWith() )
app.action('leave_channel', async ({ ack, body }) => {
  ack();
  await updateInteractiveMessage(app, body.message.ts, body.channel.id, `(Btw, if you want to leave + archive this channel, click here)`)
  await sendSingleBlockMessage(app, body.channel.id, `Are you sure? You won't be able to come back to this channel.`, `Yes, I'm sure`, 'leave_confirm', 10)
});
app.action('leave_confirm', async ({ ack, body }) => {
  ack();
  await updateInteractiveMessage(app, body.message.ts, body.channel.id, `Okay! Bye :wave:`)

  await app.client.conversations.archive({
    token: process.env.SLACK_OAUTH_TOKEN,
    channel: body.channel.id
  })
});

(async () => {
  const port = process.env.PORT || 3000;

  await app.start(port);

  console.log(`⚡️ Bolt app is running on port ${port}!`);
})();
