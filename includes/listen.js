module.exports = function({
  api,
  models
}) {
  const fs = require('fs');
  const path = require('path');
  const Users = require("./controllers/users")({
    models,
    api
  });
  const Threads = require("./controllers/threads")({
    models,
    api
  });
  const Currencies = require("./controllers/currencies")({
    models
  });
  const logger = require("../utils/log.js");
  (async () => {
    try {
      logger.loader("Tiáº¿n hĂ nh táº£i dá»¯ liá»‡u ngÆ°á»i dĂ¹ng vĂ  nhĂ³m");
      const [threads, users, currencies] = await Promise.all([
        Threads.getAll(),
        Users.getAll(['userID', 'name', 'data']),
        Currencies.getAll(['userID'])
      ]);
      for (let i = 0; i < threads.length; i++) {
        const data = threads[i];
        const idThread = String(data.threadID);
        global.data.allThreadID.push(idThread);
        global.data.threadData.set(idThread, data.data || {});
        global.data.threadInfo.set(idThread, data.threadInfo || {});
        if (data.data?.banned) {
          global.data.threadBanned.set(idThread, {
            reason: data.data.reason || '',
            dateAdded: data.data.dateAdded || ''
          });
        }
        if (data.data?.commandBanned?.length) {
          global.data.commandBanned.set(idThread, data.data.commandBanned);
        }
        if (data.data?.NSFW) {
          global.data.threadAllowNSFW.push(idThread);
        }
      }
      for (let i = 0; i < users.length; i++) {
        const dataU = users[i];
        const idUsers = String(dataU.userID);
        global.data.allUserID.push(idUsers);
        if (dataU.name?.length) {
          global.data.userName.set(idUsers, dataU.name);
        }
        if (dataU.data?.banned) {
          global.data.userBanned.set(idUsers, {
            reason: dataU.data.reason || '',
            dateAdded: dataU.data.dateAdded || ''
          });
        }
        if (dataU.data?.commandBanned?.length) {
          global.data.commandBanned.set(idUsers, dataU.data.commandBanned);
        }
      }
      for (let i = 0; i < currencies.length; i++) {
        const dataC = currencies[i];
        global.data.allCurrenciesID.push(String(dataC.userID));
      }
      logger.loader(`Táº£i thĂ nh cĂ´ng dá»¯ liá»‡u cá»§a ${global.data.allThreadID.length} nhĂ³m`);
      logger.loader(`Táº£i thĂ nh cĂ´ng dá»¯ liá»‡u cá»§a ${global.data.allUserID.length} ngÆ°á»i dĂ¹ng`);
    } catch (error) {
      logger(`Táº£i mĂ´i trÆ°á»ng tháº¥t báº¡i: ${error}`, 'error');
    }
  })();
  require('./handle/handleSchedule.js')({
    api,
    Threads,
    Users,
    models
  });
  logger(`${api.getCurrentUserID()} - [ ${global.config.PREFIX} ] â€¢ ${(!global.config.BOTNAME) ? "This bot was made by CatalizCS and SpermLord" : global.config.BOTNAME}`, "[ BOT INFO ] >");
  const handlers = fs.readdirSync(path.join(__dirname, './handle')).reduce((acc, file) => {
    return {
      ...acc,
      [path.basename(file, '.js')]: require(`./handle/${file}`)({
        api,
        models,
        Users,
        Threads,
        Currencies
      })
    };
  }, {});
  return async function(event) {
    const a = path.join(__dirname, '/../utils/data/approvedThreads.json');
    const b = path.join(__dirname, '/../utils/data/pendingThreads.json');
    if (!fs.existsSync(a)) {
      fs.writeFileSync(a, JSON.stringify([]), 'utf-8');
    }
    if (!fs.existsSync(b)) {
      fs.writeFileSync(b, JSON.stringify([]), 'utf-8');
    }
    const c = JSON.parse(fs.readFileSync(a, 'utf-8'));
    const d = global.config.ADMINBOT;
    const e = global.config.NDH;
    const f = global.config.BOXADMIN;
    let g = await api.getThreadInfo(event.threadID);
    let h = g.threadName;
    if (!c.includes(event.threadID) && !d.includes(event.senderID) && !e.includes(event.senderID)) {
      const i = (await Threads.getData(String(event.threadID))).data || {};
      const j = i.hasOwnProperty('PREFIX') ? i.PREFIX : global.config.PREFIX;
      const k = global.config.BOTNAME;
      if (event.body && event.body.toLowerCase() === 'duyetbox') {
        api.sendMessage(`[ ThĂ´ng BĂ¡o ]\n\nđŸ“œ YĂªu cáº§u duyá»‡t tá»« box ID: ${event.threadID}`, f);
        return api.sendMessage(`âœ… ÄĂ£ gá»­i yĂªu cáº§u duyá»‡t Ä‘áº¿n nhĂ³m admin!`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
          let l = JSON.parse(fs.readFileSync(b, 'utf-8'));
          if (!l.includes(event.threadID)) {
            l.push(event.threadID);
            fs.writeFileSync(b, JSON.stringify(l, null, 2), 'utf-8');
          }
        });
      }
      if (event.body && event.body.startsWith(j)) {
        return api.sendMessage(`â NhĂ³m cá»§a báº¡n chÆ°a Ä‘Æ°á»£c Admin duyá»‡t, hĂ£y chat "duyetbox" Ä‘á»ƒ yĂªu cáº§u Ä‘Æ°á»£c duyá»‡t`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
        });
      }
    }
    await handlers['handleCreateDatabase']({
      event
    });
    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        await Promise.all([
          handlers['handleCommand']({
            event
          }),
          handlers['handleReply']({
            event
          }),
          handlers['handleCommandEvent']({
            event
          })
        ]);
        break;
      case "event":
        await  handlers['handleEvent']({
          event
        })

;
        break;
      case "message_reaction":
        await handlers['handleReaction']({
          event
        });
        break;
      default:
        break;
    }
  };
};
