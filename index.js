const { Telegraf, Markup, Scenes, session } = require('telegraf')
const axios = require('axios');
require('dotenv').config()
const BOT_TOKEN = process.env.BOT_TOKEN;
const BOS_PAS = process.env.BOS_PAS;
const ipBoss = process.env.ipBoss;
const bot = new Telegraf(BOT_TOKEN);
const convert = require('xml-js');
//----------------------------------------------------------
const SceneGenerator = require('./ScenesAdmin');
const curScene = new SceneGenerator();
const AdminPanel = curScene.AdminPanel();
const AdminPanelCommand = curScene.AdminPanelCommand();
const PutATrack = curScene.PutATrack();

const SceneGeneratorUsers = require('./ScenesUser');
const curSceneUser = new SceneGeneratorUsers();
const ScenesFullList = curSceneUser.ScenesFullList();
const ScenesFullListNext = curSceneUser.ScenesFullListNext();
const ScenesSuggestATrack = curSceneUser.ScenesSuggestATrack();
const ScenesSuggestATrackCaptcha = curSceneUser.ScenesSuggestATrackCaptcha();
const PaidTrackOrder = curSceneUser.PaidTrackOrder();
const PaidTrackOrderCaptcha = curSceneUser.PaidTrackOrderCaptcha();
const OrderATrackByIdCaptcha = curSceneUser.OrderATrackByIdCaptcha();
const OrderATrackById = curSceneUser.OrderATrackById();

bot.use(Telegraf.log());

const stage = new Scenes.Stage([AdminPanel,AdminPanelCommand,PutATrack,ScenesFullList,
  ScenesFullListNext,ScenesSuggestATrack,ScenesSuggestATrackCaptcha,PaidTrackOrder,PaidTrackOrderCaptcha,
OrderATrackByIdCaptcha,OrderATrackById ]);
bot.use(session());
bot.use(stage.middleware());
//----------------------------------------------------------


//----------------------------------------------------------
//=================================================================
bot.start((ctx) => {
  ctx.replyWithHTML(
`Привет, ${ctx.message.from.first_name}, это бот интернет радио <i>"RadioSAB"</i>,
/info - Показывает информацию о треке который играл/играет/будет играть;
/list - Показывает информацию о 30 ближайших к текущему треков;
/fullList - Отправляет файл с полным списком треков на радио;
/track - Заказать трек из базы радио;
/suggest - Предложить свой трек;
/trackOrder - Поставить свой трек следующим в очередь на воспроизведение (15 рублей за трек и требуется аудио файл);
`);

});

// Выводит информацию о треке который играл/играет/будет играть
bot.command('info', async (ctx) => {
  let res;
  let data1;
  let result1;
  async function makeGetRequest() { // Получение XML
    try {
      res = await axios.get(ipBoss + '/?pass=' + BOS_PAS + '&action=playbackinfo');
      data1 = res.data;

      result1 = await convert.xml2js(data1, { compact: true, spaces: 4 }); // преобразование из xml в js

      let prevTrack = result1.Info.PrevTrack.TRACK._attributes.ITEMTITLE;//предыдущий трек
      let durationTrackPrev = result1.Info.PrevTrack.TRACK._attributes.DURATION;

      let trackNow = result1.Info.CurrentTrack.TRACK._attributes.ITEMTITLE;// трек сейчас
      let durationTrackNow = result1.Info.CurrentTrack.TRACK._attributes.DURATION;

      let lastTrack = result1.Info.NextTrack.TRACK._attributes.ITEMTITLE;//следующий трек
      let durationTrackLast = result1.Info.NextTrack.TRACK._attributes.DURATION;

ctx.replyWithHTML(`
<i>Предыдущий трек: </i>
<b>${prevTrack};</b>
<b>${durationTrackPrev};</b>
|--------------------------------------------------------------------------|
<i>Сейчас играет: </i>
<b>${trackNow};</b>
<b>${durationTrackNow};</b>
|--------------------------------------------------------------------------|
<i>Следующий трек:</i>
<b>${lastTrack};</b>
<b>${durationTrackLast};</b>
`)

    } catch (err) {
      console.log(err);
    }

  }
  makeGetRequest();
  //----------------------------------------------------------------
  //ctx.reply('Готово!');

});
//=================================================================
// вывод 50 ближайших треков
bot.command('list', async (ctx) => {

  async function GetTrackList() { // Получение XML
    try {
      let res = await axios.get(ipBoss + '/?pass=' + BOS_PAS + '&action=getplaylist2&cnt=30');
      let data2 = res.data;
      let result2 = await convert.xml2js(data2, { compact: true, spaces: 4 });

      let trackList;
      let ArrtrackListFull = [];
      for (let i = 0; i < result2.Playlist.TRACK.length; i++) {
        let ni = i + 1;
        trackList = ' ' + String(ni) + '. ' + '<b>' + result2.Playlist.TRACK[i]._attributes.CASTTITLE +'</b>' +
          ';<i> Продолжительность - </i> ' + result2.Playlist.TRACK[i]._attributes.DURATION +
          '; <i>Индекс -</i> ' + result2.Playlist.TRACK[i]._attributes.INDEX
        ArrtrackListFull.push(trackList);
      }
      let finalTrackList = '';
      for (let i = 0; i < 10; i++) {
        finalTrackList = finalTrackList + ArrtrackListFull[i] + "\n" + "\n";

      }

     await ctx.replyWithHTML(finalTrackList, Markup.inlineKeyboard(
        [
          [Markup.button.callback('Показать еще','show_more')]
        ]
      ));


      bot.action('show_more', async (ctx) => {
        finalTrackList = '';
          try {
            for (let i = 0; i < 30; i++ ){
              finalTrackList = finalTrackList + ArrtrackListFull[i] + "\n" + "\n";
            }
            await ctx.replyWithHTML(finalTrackList);

            ctx.telegram.deleteMessage(ctx.chat.id,ctx.update.callback_query.message.message_id);
          } catch (err) {
          console.log(err);
        }
      })

    } catch (err) {
      console.log(err);
    }

  }

  //--------------------------------------------------------------------
  GetTrackList();
  //ctx.reply('Готово!');
});
//================================================================

bot.command('admin', async (ctx) => {
  ctx.scene.enter('admin');
})
//=================================================================


bot.on('audio', (ctx) => {
  return ctx.reply('Вы отправили трек, зачем)? Возможно вы хотели заказать трек(/trackOrder) или предложить его(/suggest).')
})

//=================================================================

bot.command('fullList', async (ctx) => {
  ctx.scene.enter('FullList');
})
bot.command('fulllist', async (ctx) => {
  ctx.scene.enter('FullList');
})
//=================================================================
bot.command('suggest', async (ctx) => {
  ctx.scene.enter('SuggestCaptcha');
})
//=================================================================
bot.command('trackOrder', async (ctx) => {
  ctx.scene.enter('PaidTrackCaptcha');
})
bot.command('trackorder', async (ctx) => {
  ctx.scene.enter('PaidTrackCaptcha');
})
//=================================================================
bot.command('/track', async (ctx) => {
  ctx.scene.enter('OrderATrackByIdCaptcha');
})
//=================================================================
//Помощь
bot.help((ctx) => {
  ctx.replyWithHTML(
`
/info - Показывает информацию о треке который играл/играет/будет играть;
/list - Показывает информацию о 30 ближайших к текущему треков;
/fullList - Отправляет файл с полным списком треков на радио;
/track - Заказать трек из базы радио;
/suggest - Предложить свой трек;
/trackOrder - Поставить свой трек следующим в очередь на воспроизведение (15 рублей за трек и требуется аудио файл);
`)
//console.log(ctx.update.message.chat);
});
//=================================================================
bot.launch().then(res => {
  console.log('Bot started')
}).catch(err => console.log(err));
