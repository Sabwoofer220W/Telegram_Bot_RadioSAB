const {Markup,Extra,session,Scenes } = require('telegraf')
const axios = require('axios');
const convert = require('xml-js');
const fs = require('fs');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

const BOS_PAS = process.env.BOS_PAS;
const ipBoss = process.env.ipBoss;

const mongodb = require('mongodb');
const date = require('date-and-time');
let mongoClient = new mongodb.MongoClient(MongoPass, {
  useUnifiedTopology: true
});

const Captcha = require('./captcha/CreateCaptcha.js');

const QiwiBillPaymentsAPI = require('@qiwi/bill-payments-node-js-sdk');
const SECRET_KEY = '';
const qiwiApi = new QiwiBillPaymentsAPI(SECRET_KEY);

class SceneGeneratorUsers {
//=============================================================================================
//Получение файла плейлиста1
//=============================================================================================
    ScenesFullList() {
        const FullList  = new Scenes.BaseScene('FullList');

        FullList.enter(async (ctx) => {
            ctx.session.fullList = false;
ctx.replyWithHTML(`
Для получения файла плейлиста, <i>нужно ввести капчу</i>.
`,Markup.inlineKeyboard(
    [
      [Markup.button.callback('Принять','button1'),Markup.button.callback('Отмена','button2')]
    ]
  ))
  FullList.action('button1', async (ctx) => {
    ctx.scene.enter('FullListNext');
  });
  FullList.action('button2', async (ctx) => {
    await ctx.reply('Вы успешно вышли из команды /fullList')
    await ctx.scene.leave();
  });


        })

        return FullList
    }
//=============================================================================================
//Получение файла плейлиста2
//=============================================================================================

ScenesFullListNext() {
const FullListNext  = new Scenes.BaseScene('FullListNext');
FullListNext.enter(async (ctx) => {
ctx.session.Captcha = Captcha.CreateCaptcha();
async function getCaptca() {
await ctx.replyWithPhoto({ source:'./captcha/cap.png'},{ caption: "*Введите капчу, либо напишите отмена в ручную*",parse_mode: 'MarkdownV2'});
}
setTimeout(getCaptca, 2000);
})
FullListNext.on('text', async (ctx) => {

ctx.session.textCaptcha = ctx.message.text;
if((ctx.session.textCaptcha).toUpperCase() == ctx.session.Captcha){
  await ctx.replyWithDocument({ source: 'filelist/RadioSAB.txt' });
  ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
  ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
  ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-2)
  await ctx.scene.leave();
}else if((ctx.session.textCaptcha).toUpperCase() == 'ОТМЕНА'){
  await ctx.reply(`Заявка на получение файла плейлиста отменена`);
await ctx.scene.leave()
} else {
  ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
  ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
  ctx.scene.enter('FullListNext');
}
});
return FullListNext

}
//=============================================================================================
//Предложка треков
//=============================================================================================
ScenesSuggestATrackCaptcha() {
  const SuggestCaptcha = new Scenes.BaseScene('SuggestCaptcha');
  SuggestCaptcha.enter(async (ctx) => {
    ctx.session.UserID = ctx.update.message.chat.id;
    mongoClient.connect(async function(error, mongo) {
    	if (!error) {
    		console.log('connection is mongodb1');
            let db = mongo.db('RadioSAB');
            let users = db.collection('Users');
            //Подсчет и добавление пользователя
            let usersArr = await users.find({userID:ctx.update.message.chat.id}).toArray();
            const now = new Date();
            if (usersArr.length == 0) {
            let newUser = {
            	userID:ctx.update.message.chat.id,
            	first_name:ctx.update.message.chat.first_name,
            	username:ctx.update.message.chat.username,
            	date:date.format(now, 'DD.MM.YYYY'),
            	suggest:0,
              suggestId:0,
              paidTrack:false,
              idpaidTrack:'',
              linkpayment:'',
              nameTrack:'',
            				}
            				users.insertOne(newUser);
                  }
let userid = await users.findOne({userID:ctx.update.message.chat.id});
// Создание времени для проверки
let DateNow = date.format(now, 'DD.MM.YYYY');
let formatDateNow = (DateNow.split('.'))[0];
let formatDateUserid = ((userid.date).split('.'))[0];

    if(userid.suggest >= 3){
      if (formatDateNow > formatDateUserid) {
      users.updateOne({userID:ctx.update.message.chat.id}, {$set: {suggestId:0,suggest:0,date:DateNow}});
      console.log('Сброшено');
      await ctx.scene.reenter();
    } else {
      await ctx.replyWithHTML('В день можно предложить только <b>3 трека!</b>');
      await ctx.scene.leave();
    }

  } else if (formatDateNow > formatDateUserid) {
    users.updateOne({userID:ctx.update.message.chat.id}, {$set: {suggestId:0,suggest:0,date:DateNow}});
    console.log('Сброшено');
    await ctx.scene.reenter();
  }else{
  ctx.session.Captcha = Captcha.CreateCaptcha();
  async function getCaptca() {
  await ctx.replyWithPhoto({ source:'./captcha/cap.png'},{ caption: "*Введите капчу, либо напишите отмена в ручную*",parse_mode: 'MarkdownV2' });
  }
  setTimeout(getCaptca, 2000);
    }
  }else {
    console.error(err);
    await ctx.replyWithHTML('<i>Ошибка!</i> База данных не отвечает, обратитесь к администратору @Sabwoofer220w !')
    await ctx.scene.leave()
  }
});
  });
  SuggestCaptcha.on('text', async (ctx) => {
    ctx.session.textCaptcha = ctx.message.text;
    if((ctx.session.textCaptcha).toUpperCase() == ctx.session.Captcha){
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-2)
        ctx.scene.enter('Suggest');
    }else if((ctx.session.textCaptcha).toUpperCase() == 'ОТМЕНА'){
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-2)
      await ctx.reply(`Команда /suggest успешно отменена!`,Markup.removeKeyboard(true));
    await ctx.scene.leave()
    } else {
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
      ctx.scene.enter('SuggestCaptcha');
    }
  });
  return SuggestCaptcha
}
//=============================================================================================
//=============================================================================================
ScenesSuggestATrack() {
const Suggest  = new Scenes.BaseScene('Suggest');
Suggest.enter(async (ctx) => {
  ctx.replyWithHTML(
`
Отправьте трек, который по вашему мнению подходит для радио, после модерации и оценки, возможно данная композиция будет добавлена в базу.
<i>Внимание! В день можно предложить только 3 трека!</i>
`,Markup.keyboard(['Отмена']).oneTime().resize());
});
Suggest.on('message', async (ctx) => {
  try{
    ctx.session.textAudio = await ctx.message.text;
if (ctx.update.message.audio) {
  if (ctx.update.message.audio.duration < 480){
    console.log('>480');
    //Скачивание трека
  const files = ctx.update.message.audio;
    console.log(files);
    var fileId = await files.file_id;

    let res = await axios.get(`TgPass/getFile?file_id=${fileId}`).then(token => { return token } )
    let file_path = await res.data.result.file_path;

    ctx.session.ResFile_unique_id = res.data.result.file_unique_id;

    var file = await fs.createWriteStream("./Music/"+files.file_name);
    var request = await https.get(`TgPass${file_path}`, function(response) {
     response.pipe(file);});
     //Подсчет
     mongoClient.connect(async function(error, mongo) {
     	if (!error) {
     		console.log('connection is mongodb2');
             let db = mongo.db('RadioSAB');
             let users = db.collection('Users');
     				let usersArr = await users.find({userID:ctx.update.message.chat.id}).toArray();
     				const now = new Date();

             users.updateOne({userID:ctx.update.message.chat.id}, {$set: {suggest : usersArr[0].suggest + 1}});
             ctx.replyWithHTML('Спасибо за ваш трек, он был успешно отправлен!',Markup.removeKeyboard(true));
             await ctx.scene.leave();

     	} else {
     		console.error(err);
     	}
       });

  } else {
    ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id);
    ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1);
    ctx.replyWithHTML('Отправленный трек слишком длинный! Вы вышли из команды!',Markup.removeKeyboard(true));
    await ctx.scene.leave();
  }

} else if (ctx.session.textAudio === "Отмена"){
ctx.replyWithHTML('Команда /suggest успешно отменена!',Markup.removeKeyboard(true));
await ctx.scene.leave();
} else {
  ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id);
  ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1);
  //ctx.replyWithHTML('<b>Отправьте аудио файл!</b> Либо <i>отмените</i> команду!');
  await ctx.scene.reenter();
}

}catch (err) {console.log(err);await ctx.replyWithHTML('<i>Ошибка!</i> База данных не отвечает, обратитесь к администратору @Sabwoofer220w !')
await ctx.scene.leave()}
  //---------------------------------------------------------------------------------------------------------------------

  });
  //---------------------------------------------------------------------------------------------------------------------
return Suggest
}
//=============================================================================================
//=============================================================================================
PaidTrackOrderCaptcha(){
  const PaidTrackCaptcha = new Scenes.BaseScene('PaidTrackCaptcha');
  PaidTrackCaptcha.enter(async (ctx) => {
    ctx.session.Captcha = Captcha.CreateCaptcha();
    async function getCaptca() {
    await ctx.replyWithPhoto({ source:'./captcha/cap.png'},{ caption: "*Введите капчу, либо напишите отмена в ручную*",parse_mode: 'MarkdownV2' });
    }
    setTimeout(getCaptca, 2000);
  });
  PaidTrackCaptcha.on('text', async (ctx) => {
  ctx.session.textCaptcha = ctx.message.text;
  if((ctx.session.textCaptcha).toUpperCase() == ctx.session.Captcha){
    ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
    ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
    ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-2)
    await ctx.scene.enter('PaidTrack');
  }else if((ctx.session.textCaptcha).toUpperCase() == 'ОТМЕНА'){
    ctx.replyWithHTML('Команда /trackOrder успешно отменена!',Markup.removeKeyboard(true));
  await ctx.scene.leave()
  } else {
    ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
    ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
    ctx.scene.reenter();
  }
  });
  return PaidTrackCaptcha
}
//--------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------
PaidTrackOrder(){
  //--------------------------------------------------------
  const PaidTrack = new Scenes.BaseScene('PaidTrack');
  PaidTrack.enter(async (ctx) => {

    ctx.replyWithHTML(
`Отправьте аудио файл который хотите проиграть на радио!
`,Markup.keyboard(['Отмена']).oneTime().resize());
  ctx.session.buttonOutput = false;// проверка вывода кнопок
  });
    //--------------------------------------------------------
    PaidTrack.on('message', async (ctx) => {
      try{
        ctx.session.textAudio = await ctx.message.text;
        if (ctx.update.message.audio) {
          if (ctx.update.message.audio.duration < 480){
//----------------------------------------------------------------------------------
          async function SaveMusic() {
            console.log('========================SaveMusic========================');
            const files = ctx.update.message.audio;
              var fileId = await files.file_id;
              let res = await axios.get(`TgPass/getFile?file_id=${fileId}`).then(token => { return token } )
              let file_path = await res.data.result.file_path;
              ctx.session.file_name = files.file_name;
              var file = await fs.createWriteStream("./PaidMusic/"+files.file_name);
              var request = await https.get(`TgPass${file_path}`, function(response) {
               response.pipe(file);});
          }

        async function CreateQiwi() {
          console.log('========================CreateQiwi========================');
            const publicKey = await '';
              const idOeder = await uuidv4();
                ctx.session.idOeder = idOeder;
              const params = await {
                  publicKey,
                  amount: 14,
                  billId: idOeder,
                  comment: 'Воспроизвести трек: '+ctx.session.file_name+' на RadioSAB',
              };
              const link = await qiwiApi.createPaymentForm(params);
              ctx.session.link = link;
          }

//----------------------------------------------------------------------------------
               mongoClient.connect(async function(error, mongo) {
                 if (!error) {
                   console.log('connection is mongodb3');
                       let db = mongo.db('RadioSAB');
                       let users = db.collection('Users');
                       let usersArr = await users.find({userID:ctx.update.message.chat.id}).toArray();
                       //console.log(usersArr);
                       const now = new Date();
//----------------------------------------------------------------------------------
                         if (usersArr.length == 0) {
                           await SaveMusic();
                          await CreateQiwi();
                           let newUser = {
                           	userID:ctx.update.message.chat.id,
                           	first_name:ctx.update.message.chat.first_name,
                           	username:ctx.update.message.chat.username,
                           	date:date.format(now, 'DD.MM.YYYY'),
                           	suggest:0,
                            suggestId:0,
                             paidTrack:true,
                             idpaidTrack:ctx.session.idOeder,
                             linkpayment:ctx.session.link,
                             nameTrack:ctx.session.file_name,
                           				}
                           				users.insertOne(newUser);
ctx.replyWithHTML(
`
<b>Вот ваша <a href="${ctx.session.link}">Ссылка для оплыты</a></b>,
после перечисления нажмите <i>"Подтвердить оплату"</i>,
вы можете отложить оплату либо отменить ее!
Если кнопки не работают, перейдите по ссылке для оплаты и попробуйте снова.
`,Markup.inlineKeyboard(
    [
      [Markup.button.callback('🔴Отменить оплату','But1'),Markup.button.callback('🟢Подтвердить оплату','But2')],
      [Markup.button.callback('🟡Отложить оплату -->','But3')]
    ]
  ));

  //setTimeout(()=>{ctx.scene.leave()},1000)

  ctx.session.buttonOutput = true;// проверка вывода кнопок
  //-----------------------------------------

//-----------------------------------------
} else {
  ctx.session.usersArr = await users.find({userID:ctx.update.message.chat.id}).toArray();
  if (ctx.session.usersArr[0].paidTrack == false) {
    try{
      await fs.unlinkSync("./PaidMusic/"+ctx.session.usersArr[0].nameTrack);
  } catch (err) {console.log(err);}

  await SaveMusic();
    await CreateQiwi();
  await users.updateOne({userID:ctx.update.message.chat.id}, {"$set": {"paidTrack":true,"idpaidTrack":ctx.session.idOeder,"linkpayment":ctx.session.link,"nameTrack":ctx.session.file_name}});
  ctx.replyWithHTML(
  `
<b>Вот ваша <a href="${ctx.session.link}">Ссылка для оплыты</a></b>,
после перечисления нажмите <i>"Подтвердить оплату"</i>,
вы можете отложить оплату либо отменить ее!
  `,Markup.inlineKeyboard(
      [
        [Markup.button.callback('🔴Отменить оплату','But1'),Markup.button.callback('🟢Подтвердить оплату','But2')],
        [Markup.button.callback('🟡Отложить оплату -->','But3')]
      ]
    ));
    ctx.session.buttonOutput = true;// проверка вывода кнопок
    //-----------------------------------------

} else if (ctx.session.usersArr[0].paidTrack == true) {
ctx.session.usersArr = await users.find({userID:ctx.update.message.chat.id}).toArray();
  ctx.replyWithHTML(
  `
Вы уже заказывали трек и не оплатили его!
<b>Вот ваша <a href="${ctx.session.usersArr[0].linkpayment}">Ссылка для оплыты</a> </b>,
<b>Пожалуйста</b>, оплатите предыдущий трек либо <b>отмените</b> оплату и повторите попытку.
`,Markup.inlineKeyboard(
      [
        [Markup.button.callback('🔴Отменить оплату','But1'),Markup.button.callback('🟢Подтвердить оплату','But2')],
        [Markup.button.callback('🟡Отложить оплату -->','But3')]
      ]
    ));
    ctx.session.buttonOutput = true;// проверка вывода кнопок
}

}

PaidTrack.action('But1', async (ctx) => {
  try{
    ctx.session.usersArr = await users.find({userID:ctx.update.callback_query.message.chat.id}).toArray();
    qiwiApi.cancelBill(ctx.session.usersArr[0].idpaidTrack).then( data => {
  ctx.replyWithHTML(ctx.update.message);
  users.updateOne({userID:ctx.session.usersArr[0].userID}, {"$set": {"paidTrack":false}});
  fs.unlinkSync("./PaidMusic/"+ctx.session.usersArr[0].nameTrack);
  ctx.replyWithHTML(`Вы успешно отменили заказ трека ${ctx.session.usersArr[0].nameTrack}`,Markup.removeKeyboard(true));
  ctx.session.buttonOutput = false;// проверка вывода кнопок
  ctx.scene.leave();
});
  }catch (err) {
    ctx.replyWithHTML('Что-то пошло не так, повторите команду, либо поробуйте перейти по ссылке для оплаты и повторите попытку!');
    console.log(err);}

});
//----------------------------------------------------------------------------------------------------------------------
PaidTrack.action('But2', async (ctx) => {
  try{
ctx.session.usersArr = await users.find({userID:ctx.update.callback_query.message.chat.id}).toArray();
    qiwiApi.getBillInfo(ctx.session.usersArr[0].idpaidTrack).then( data => {
//----------------------------------------------------------------------------------------------------------------------
      if (data.status.value === 'WAITING') { // PAID
        console.log(ctx.session.usersArr[0].nameTrack);

  async function getCountTrackList() {
    await axios.post(ipBoss +'/?pass=' + BOS_PAS + '&action=inserttrack&filename=A%3A%5CTelegram_bots%5CPaidMusic%5C' + encodeURIComponent(ctx.session.usersArr[0].nameTrack) + '&pos=-1');
        let res = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=getplaylist2&cnt=1');
        let data2 = res.data;
        let result2 = await convert.xml2js(data2, { compact: true, spaces: 4 });
        //console.log(result2.Playlist._attributes.COUNT);
        await axios.post(ipBoss +'/?pass=' + BOS_PAS + '&action=setnexttrack&pos='+result2.Playlist._attributes.COUNT);
      }

      getCountTrackList();

          ctx.replyWithHTML(
`
Трек оплачен и был добавлен в очередь!
Он будет проигран следующим!
<b>Внимание!</b> Не заказывайте следующий трек пока не будет проигран первый!
Иначе это приведет к остановке воспроизведения первого заказанного трека.
`,Markup.removeKeyboard(true));

  users.updateOne({userID:ctx.session.usersArr[0].userID}, {"$set": {"paidTrack":false}});

setTimeout(()=>{ctx.scene.leave()},500)
//----------------------------------------------------------------------------------------------------------------------
      } else if (data.status.value === 'WAITING') {
        ctx.replyWithHTML(
`
Заказ не оплачен! Оплатите и повторите попытку нажатием той же кнопки!
`);
        console.log('WAITING');
//----------------------------------------------------------------------------------------------------------------------
      } else if (data.status.value === 'REJECTED') {
        ctx.replyWithHTML(
`
Оплата была отменена!
`);
ctx.scene.leave();
        console.log('REJECTED');
//----------------------------------------------------------------------------------------------------------------------
      } else if (data.status.value === 'EXPIRED') {
        ctx.replyWithHTML(
`
Время оплаты истекло!
`);
ctx.scene.leave();
        console.log('EXPIRED');
      }
//----------------------------------------------------------------------------------------------------------------------
    });
    ctx.session.buttonOutput = false;// проверка вывода кнопок
  }catch (err) {
    ctx.replyWithHTML('Пожалуйста перейдите по ссылке и оплатите заказ!');
    console.log(err);}
});
//-----------------------------------------
PaidTrack.action('But3', async (ctx) => {
  try{
  ctx.replyWithHTML('Оплата была отложена, для возобновления оплаты, снова используйте команду /trackOrder');
    ctx.session.buttonOutput = false;// проверка вывода кнопок
    ctx.scene.leave();
  }catch (err) {console.log(err);}
});
                 }else {
                		console.error(err);
                	}
               });
          }else {
            ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id);
            ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1);
            ctx.replyWithHTML('Отправленный трек слишком длинный! Вы вышли из команды!',Markup.removeKeyboard(true));
            await ctx.scene.leave();
          }
        } else if (ctx.session.textAudio === "Отмена"){
        ctx.replyWithHTML('Команда /trackOrder успешно отменена!',Markup.removeKeyboard(true));
        await ctx.scene.leave();
        } else {
          if (ctx.session.buttonOutput == false) {
            ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id);
            ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1);
            ctx.replyWithHTML('<b>Отправьте аудио файл!</b> Либо <i>отмените</i> команду!');
            await ctx.scene.reenter();
          } else if (ctx.session.buttonOutput == true) {
            ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id);

            ctx.replyWithHTML('Выберите кнопку с предложенными действиями! ');
          } else {
            ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id);
            ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1);
            ctx.replyWithHTML('<b>Отправьте аудио файл!</b> Либо <i>отмените</i> команду!');
            await ctx.scene.reenter();
          }

        }
      }catch (err) {console.log(err);await ctx.replyWithHTML('<i>Ошибка!</i> База данных не отвечает, обратитесь к администратору @Sabwoofer220w !',Markup.removeKeyboard(true))
      await ctx.scene.leave()}
    });

return PaidTrack

}
//=============================================================================================
// заказ трека по id
//=============================================================================================
OrderATrackByIdCaptcha(){
  const OrderATrackByIdCaptcha = new Scenes.BaseScene('OrderATrackByIdCaptcha');
  OrderATrackByIdCaptcha.enter(async (ctx) => {
    ctx.session.UserID = ctx.update.message.chat.id;
    mongoClient.connect(async function(error, mongo) {
      if (!error) {
        console.log('connection is mongodb4');
            let db = mongo.db('RadioSAB');
            let users = db.collection('Users');

            //Подсчет и добавление пользователя
            let usersArr = await users.find({userID:ctx.update.message.chat.id}).toArray();
            const now = new Date();
            if (usersArr.length == 0) {
            let newUser = {
              userID:ctx.update.message.chat.id,
              first_name:ctx.update.message.chat.first_name,
              username:ctx.update.message.chat.username,
              date:date.format(now, 'DD.MM.YYYY'),
              suggest:0,
              suggestId:0,
              paidTrack:false,
              idpaidTrack:'',
              linkpayment:'',
              nameTrack:'',
                    }
                    users.insertOne(newUser);
                  }
  let userid = await users.findOne({userID:ctx.update.message.chat.id});
  // Создание времени для проверки
  let DateNow = date.format(now, 'DD.MM.YYYY');
  let formatDateNow = (DateNow.split('.'))[0];
  let formatDateUserid = ((userid.date).split('.'))[0];

    if(userid.suggestId >= 3){
      if (formatDateNow > formatDateUserid) {
      users.updateOne({userID:ctx.update.message.chat.id}, {$set: {suggest:0,suggestId:0,date:DateNow}});
      console.log('Сброшено');
      await ctx.scene.reenter();
    } else {
      await ctx.replyWithHTML('В день можно заказать только <b>3 трека!</b>');
      await ctx.scene.leave();
    }

  } else if (formatDateNow > formatDateUserid) {
    users.updateOne({userID:ctx.update.message.chat.id}, {$set: {suggest:0,suggestId:0,date:DateNow}});
    console.log('Сброшено');
    await ctx.scene.reenter();
  }else{
  ctx.session.Captcha = Captcha.CreateCaptcha();
  async function getCaptca() {
  await ctx.replyWithPhoto({ source:'./captcha/cap.png'},{ caption: "*Введите капчу, либо напишите отмена в ручную*",parse_mode: 'MarkdownV2' });
  }
  setTimeout(getCaptca, 2000);
    }
  }else {
    console.error(err);
    await ctx.replyWithHTML('<i>Ошибка!</i> База данных не отвечает, обратитесь к администратору @Sabwoofer220w !')
    await ctx.scene.leave()
  }
  });
  });
  OrderATrackByIdCaptcha.on('text', async (ctx) => {
    ctx.session.textCaptcha = ctx.message.text;
    if((ctx.session.textCaptcha).toUpperCase() == ctx.session.Captcha){
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-2)
        ctx.scene.enter('OrderATrackById');
    }else if((ctx.session.textCaptcha).toUpperCase() == 'ОТМЕНА'){
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-2)
      await ctx.reply(`Команда отменена!`,Markup.removeKeyboard(true));
    await ctx.scene.leave()
    } else {
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id)
      ctx.telegram.deleteMessage(ctx.chat.id,ctx.message.message_id-1)
    await ctx.scene.reenter();
    }
  });
  return OrderATrackByIdCaptcha
}
//=============================================================================================================
OrderATrackById(){
  const OrderATrackById = new Scenes.BaseScene('OrderATrackById');
  OrderATrackById.enter(async (ctx) => {
    ctx.replyWithHTML(
  `Отправьте номер трека который хотите проиграть, его можно узнать используя команды <b>/list</b> или <b>/fullList</b>
  <i>Внимание! В день можно заказать только 3 трека!</i>
  `,Markup.keyboard(['Отмена','/list','/fullList']).oneTime().resize());
});
OrderATrackById.on('text', async (ctx) => {
  ctx.session.textCaptcha = await ctx.message.text;

  async function getCountTrackList() {
        let res = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=getplaylist2&cnt=1');
        let data2 = res.data;
        let result2 = await convert.xml2js(data2, { compact: true, spaces: 4 });
        return result2.Playlist._attributes.COUNT
      }

      const countTrackList = await getCountTrackList();


  if ((ctx.session.textCaptcha).toUpperCase() === 'ОТМЕНА') {
    await ctx.reply(`Заявка отменена!`,Markup.removeKeyboard(true));
    await ctx.scene.leave();
  } else if (ctx.session.textCaptcha === '/list') {
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
    //await ctx.scene.reenter();
  } else if (ctx.session.textCaptcha === '/fullList') {
      await ctx.replyWithDocument({ source: 'filelist/RadioSAB.txt' });
  } else if (parseInt(ctx.session.textCaptcha)>parseInt(countTrackList) ) {
    await ctx.replyWithHTML('Трека с таким id нет в базе!');
    await ctx.scene.reenter();
  } else {
  mongoClient.connect(async function(error, mongo) {
    if (!error) {
      let db = mongo.db('RadioSAB');
      let users = db.collection('Users');
      try{
      let res = await axios.post(ipBoss +'/?pass=' + BOS_PAS + '&action=trackinfo&pos=' + ctx.session.textCaptcha);
      let data2 = res.data;
      let result2 = await convert.xml2js(data2, { compact: true, spaces: 4 });
      const resSplit = await (result2.Info.Track.TRACK._attributes.FILENAME).split('\\');
      console.log(resSplit);
      let lengthresSplit = resSplit.length - 1;

ctx.replyWithHTML(
`
Вы хотите проиграть ${resSplit[lengthresSplit]} ?
`,Markup.inlineKeyboard([[Markup.button.callback('🔴Изменить','But4'),Markup.button.callback('🟢Подтвердить','But5')]]));
} catch(err) {
  console.log(err);
  await ctx.replyWithHTML('Вы ввели некорректный id трека',Markup.removeKeyboard(true))
  await ctx.scene.reenter();
}
OrderATrackById.action('But4', async (ctx) => {
  try{
    await ctx.scene.reenter();
  }catch (err) {
    console.log(err);
    await ctx.replyWithHTML('<i>Произошла непредвиденная ошибка!</i>, обратитесь к администратору @Sabwoofer220w !',Markup.removeKeyboard(true))
  }
    });
OrderATrackById.action('But5', async (ctx) => {
      try{
          let usersArr = await users.find({userID:ctx.update.callback_query.from.id}).toArray();
        await users.updateOne({userID:ctx.update.callback_query.from.id}, {$set: {suggestId : usersArr[0].suggestId + 1}});
        await axios.post(ipBoss +'/?pass=' + BOS_PAS + '&action=setnexttrack&pos='+ctx.session.textCaptcha);
        await ctx.replyWithHTML('Трек был поставлен в очередь! Приятного прослушивания.',Markup.removeKeyboard(true));
        await ctx.scene.leave()
      }catch (err) {
        console.log(err);
        await ctx.replyWithHTML('<i>Произошла непредвиденная ошибка!</i>, обратитесь к администратору @Sabwoofer220w !',Markup.removeKeyboard(true))
      }
        });
    }else {
      console.error(err);
      await ctx.replyWithHTML('<i>Ошибка!</i> База данных не отвечает, обратитесь к администратору @Sabwoofer220w !',Markup.removeKeyboard(true))
      await ctx.scene.leave()
    }
      });
    }
        });
  return OrderATrackById
}
                        }
module.exports = SceneGeneratorUsers;
