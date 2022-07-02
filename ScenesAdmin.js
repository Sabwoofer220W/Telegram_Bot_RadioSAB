const { Telegraf,Markup,Extra,session } = require('telegraf')
const {Scenes} = require('telegraf')
const axios = require('axios');
require('dotenv').config()
const BOS_PAS = process.env.BOS_PAS;
const AdminName1 = process.env.AdminName1;
const AdminPass = process.env.AdminPass;
const ipBoss = process.env.ipBoss;
const convert = require('xml-js');
const fs = require('fs');


class SceneGenerator {
  //=============================================================================================
  //=============================================================================================
    AdminPanel () {
    const admin = new Scenes.BaseScene('admin');
    //=================================================================
    admin.enter(async (ctx) => {
        if (ctx.message.chat.username == AdminName1) {
        await ctx.reply('Введите пароль для входа в панель администратора.')
        } else {
        await ctx.reply('Вам не доступна данная команда!')
        await ctx.scene.leave()
        }
    })
    //=================================================================
    admin.on('text', async (ctx) => {
        const currPass = Number(ctx.message.text);
        console.log(currPass);
        console.log(AdminPass);
        console.log(currPass == AdminPass);
        ctx.session.StatPause = false;
        if (currPass == AdminPass) {
        await ctx.reply(`Здравствуйте господин ведущий ${ctx.message.chat.first_name}! `, Markup
        .keyboard([
          ['/next', '/pause'],
          ['/infoAdmin ', '/listAdmin','/putatrack'],
          ['/createfile ', '', '/exit']
        ])
        .oneTime()
        .resize());


        ctx.scene.enter('adminCommand');
        } else {
            await ctx.reply(`Введен не верный пароль!`);
            console.log('Была совершена неудачная попытка входа!');
            ctx.scene.reenter()
        }
    })
    //=================================================================

  return admin
}
//=============================================================================================
//=============================================================================================

    AdminPanelCommand(){
        const adminCommand = new Scenes.BaseScene('adminCommand');
        adminCommand.enter((ctx) => ctx.reply(`Что нужно делать?`));

//===================================================================================================
        //переход на следующий трек
        adminCommand.command('next', (ctx) => {
          async function GetNextTrack() {
            let res;
            let data1;
            let result1;
            try {
              res = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=playbackinfo');
              data1 = res.data;
              result1 =  await convert.xml2js(data1, { compact: true, spaces: 4 }); // преобразование из xml в js

              let trackNow = result1.Info.CurrentTrack.TRACK._attributes.ITEMTITLE;// трек сейчас
              let durationTrackNow = result1.Info.CurrentTrack.TRACK._attributes.DURATION;
              let playcounTtrackNow = result1.Info.CurrentTrack.TRACK._attributes.PLAYCOUNT;

              let lastTrack = result1.Info.NextTrack.TRACK._attributes.ITEMTITLE;
              let durationTrackLast = result1.Info.NextTrack.TRACK._attributes.DURATION;
              let playcountTrackLast = result1.Info.NextTrack.TRACK._attributes.PLAYCOUNT;

             ctx.replyWithHTML(
`
<i>Сейчас играет:</i>
Название - <b>${trackNow};</b>
Продолжительность - <b>${durationTrackNow};</b>
Индекс - <b>${playcounTtrackNow}</b>
|--------------------------------------------------------|
<i>Следующий трек:</i>
Название - <b>${lastTrack};</b>
Продолжительность - <b>${durationTrackLast};</b>
Индекс - <b>${playcountTrackLast}</b>
`, Markup.inlineKeyboard(
  [
    [Markup.button.callback('Поставить следующий','buttonNextTrack')],
    [Markup.button.callback('Отмена','buttonNextTrackClose')]
  ]
)
);
ctx.session.message_id = ctx.message.message_id;

            } catch (err) {
              console.log(err);
          }
          }
          GetNextTrack();

          adminCommand.action('buttonNextTrack', async (ctx) => {
            try{
           await axios.post(ipBoss +'/?pass=' + BOS_PAS + '&cmd=next');
           let res2 = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=playbackinfo');
           let data2 = await res2.data;
            let result2 =  await convert.xml2js(data2, { compact: true, spaces: 4 });

           let trackNow2 = await result2.Info.CurrentTrack.TRACK._attributes.ITEMTITLE;// трек сейчас
           let durationTrackNow2 =  await result2.Info.CurrentTrack.TRACK._attributes.DURATION;
           let playcounTtrackNow2 =  await result2.Info.CurrentTrack.TRACK._attributes.PLAYCOUNT;

            let NewTextTrack = await `
Сейчас играет:
Название - ${trackNow2};
Продолжительность - ${durationTrackNow2};
Индекс - ${playcounTtrackNow2}
`
            await ctx.editMessageText(NewTextTrack,Markup.inlineKeyboard(
              [
                [Markup.button.callback('Поставить следующий','buttonNextTrack')],
                [Markup.button.callback('Отмена','buttonNextTrackClose')]
              ]
            ),ctx.session.message_id);
            } catch (err) {
              console.log(err);
          }
          });
          adminCommand.action('buttonNextTrackClose', async (ctx) => {
            await ctx.reply('Отмена!');
            ctx.scene.reenter();
          });

        });
//====================================================================================================
        //Пауза
        adminCommand.command('pause', (ctx) => {
            axios.post(ipBoss +'/?pass=' + BOS_PAS + '&cmd=pause');
            if (ctx.session.StatPause == false) {
              ctx.reply('Радио на паузе! Введите команду /pause повторно для отмены!');
              ctx.session.StatPause = true;
            } else if (ctx.session.StatPause == true) {
            ctx.reply('Радио снова вещает!');
            ctx.session.StatPause = false;
        } else {ctx.reply('Что-то пошло не так... Артур исправляй!!!!');}
      });
//====================================================================================================

        // Выводит информацию о треке который играл/играет/будет играть
        adminCommand.command('infoAdmin', async (ctx) => {
            let res;
            let data1;
            let result1;
            async function makeGetRequest() { // Получение XML
            try {
                res = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=playbackinfo');
                data1 = res.data;
                //console.log(data1);
                //ctx.reply(data1) ;
                result1 = await convert.xml2js(data1, { compact: true, spaces: 4 }); // преобразование из xml в js

                let prevTrack = result1.Info.PrevTrack.TRACK._attributes.ITEMTITLE;//предыдущий трек
                let timePrevTrack = result1.Info.PrevTrack.TRACK._attributes.LASTPLAYED;
                let durationTrackPrev = result1.Info.PrevTrack.TRACK._attributes.DURATION;
                let filePrev = result1.Info.PrevTrack.TRACK._attributes.FILENAME;

                let trackNow = result1.Info.CurrentTrack.TRACK._attributes.ITEMTITLE;// трек сейчас
                let timeTrackNow = result1.Info.CurrentTrack.TRACK._attributes.LASTPLAYED// время начало
                let durationTrackNow = result1.Info.CurrentTrack.TRACK._attributes.DURATION;
                let fileNow = result1.Info.CurrentTrack.TRACK._attributes.FILENAME;

                let lastTrack = result1.Info.NextTrack.TRACK._attributes.ITEMTITLE;//следующий трек
                let timeLastTrack = result1.Info.NextTrack.TRACK._attributes.LASTPLAYED;
                let durationTrackLast = result1.Info.NextTrack.TRACK._attributes.DURATION;
                let fileLast = result1.Info.NextTrack.TRACK._attributes.FILENAME;

        ctx.replyWithHTML(
`
<i>Предыдущий трек:</i>
Название - <b>${prevTrack};</b>
Продолжительность - <b>${durationTrackPrev};</b>
Играл - <b>${timePrevTrack};</b>
Расположение - <b>${filePrev}</b>
|----------------------------------------------------------------------------|
<i>Сейчас играет:</i>
Название - <b>${trackNow};</b>
Продолжительность - <b>${durationTrackNow};</b>
Играет - <b>${timeTrackNow};</b>
Расположение - <b>${fileNow}</b>
|-----------------------------------------------------------------------------|
<i>Следующий трек:</i>
Название - <b>${lastTrack};</b>
Продолжительность - <b>${durationTrackLast};</b>
В последний раз играл - <b>${timeLastTrack};</b>
Расположение - <b>${fileLast}</b>
`
                );

            } catch (err) {
                console.log(err);
            }

            }
            makeGetRequest();
//-------------------------------------------------------------------------------------------------------
            ctx.reply('Готово!');

        });

//==========================================================================================================

        adminCommand.command('listAdmin', async (ctx) => {

            async function GetTrackList() { // Получение XML
              try {
                let res = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=getplaylist2&cnt=50');
                let data2 = res.data;
                let result2 = await convert.xml2js(data2, { compact: true, spaces: 4 });
                let trackList;
                let ArrtrackListFull = [];
                for (let i = 0; i < result2.Playlist.TRACK.length; i++) {
                  let ni = i + 1;
                  trackList = ' ' + String(ni) + '. ' + result2.Playlist.TRACK[i]._attributes.CASTTITLE +
                    '; Продолжительность - ' + result2.Playlist.TRACK[i]._attributes.DURATION +
                    '; Индекс - ' + result2.Playlist.TRACK[i]._attributes.INDEX
                  ArrtrackListFull.push(trackList);
                }
                let finalTrackList = '';
                for (let i = 0; i < 50; i++) {
                  finalTrackList = finalTrackList + ArrtrackListFull[i] + "\n" + "\n";
                }
                await ctx.reply(finalTrackList);
            } catch (err) {
                console.log(err);
              }
        }

        GetTrackList();
        ctx.reply('Готово!');

    })
//======================================================================================================

        adminCommand.command('putatrack', async (ctx) => {
            ctx.scene.enter('adminPutATrack')
        })
//======================================================================================================
        adminCommand.command('createfile', async (ctx) => {

            async function GetAllTrack() { // Получение XML
                try {
                  let res = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=getplaylist2&cnt=0');
                  let data4 = res.data;
                  let result4 = await convert.xml2js(data4, { compact: true, spaces: 4 });
                  let trackList;
                  let ArrtrackListFull = [];
                  for (let i = 0; i < result4.Playlist.TRACK.length; i++) {
                    let ni = i + 1;
                    trackList = ' ' + String(ni) + '. ' + result4.Playlist.TRACK[i]._attributes.CASTTITLE +
                      '; Продолжительность - ' + result4.Playlist.TRACK[i]._attributes.DURATION +
                      '; Индекс - ' + result4.Playlist.TRACK[i]._attributes.INDEX
                    ArrtrackListFull.push(trackList);
                  }
                  let finalTrackList = '';
                  for (let i = 0; i < result4.Playlist.TRACK.length; i++) {
                    finalTrackList = finalTrackList + ArrtrackListFull[i] + "\n" + "\n";
                  }
                  await fs.writeFileSync(
                    'filelist/RadioSAB.txt',
                    finalTrackList,
                    'utf8'
                  );
                  console.log('Done');
              } catch (err) {
                  console.log(err);
                }
          }

          GetAllTrack();
          ctx.reply('База треков была записана в файл!');
          ctx.replyWithDocument({ source: 'filelist/RadioSAB.txt' });

          })
//====================================================================================================

adminCommand.command('helpAdmin', async (ctx) => {
  await ctx.replyWithHTML(`
<i>Господин ведущий! Запомните эти команды!</i>

/next - перейти на следущий трек;
/pause - ставит радио на паузу;
/infoAdmin - Выводит информацию о треке который играл/играет/будет играть (расширенная версия);
/listAdmin - Показыват информацию о 50 ближайших к текущему треков (сразу);
/putatrack - Поставить трек в очередь (нужно знать индекс трека);
/createfile - Обновляет файл со списком всех треков в плейлисте и отправляет его сообщением(так же этот файл доступен пользователю);
/exit - Выход с панели администратора;

  `);
})

//====================================================================================================
        adminCommand.command('exit', async (ctx) => {
            await ctx.reply(`Спасибо за работу господин ведущий!`)
            await ctx.scene.leave()
        })
//==============================================================================================================
        return adminCommand
    }

    //========================================================================================================
    //=========================================================================================================
    PutATrack() {
        const adminPutATrack = new Scenes.BaseScene('adminPutATrack');
        adminPutATrack.enter((ctx) => ctx.reply(`Вставка в очередь трека с индексом - `));

        adminPutATrack.on('text', async (ctx) => {
            const IndexTrack = Number(ctx.message.text);
            axios.post(ipBoss +'/?pass=' + BOS_PAS + '&action=setnexttrack&pos=' + IndexTrack);
            async function GetTrackInfo() {
                try {
                    let res = await axios.get(ipBoss +'/?pass=' + BOS_PAS + '&action=trackinfo&pos=' + IndexTrack);
                    let data3 = res.data;
                    let result3 = await convert.xml2js(data3, { compact: true, spaces: 4 });
                    //console.log(result3.Info.Track.TRACK.FILENAME);
                    ctx.reply(`Трек - ${result3.Info.Track.TRACK._attributes.FILENAME} добавлен`);
                } catch (err) {
                    console.log(err);
                  }
            }
            await GetTrackInfo();
           //await ctx.reply('Готово!');
           await ctx.scene.enter('adminCommand')

        })

        return adminPutATrack
    }
    //=============================================================================================================
    //===============================================================================================================
}

module.exports = SceneGenerator
