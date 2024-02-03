
/*------------------------------------------------------------------------------------*
|   하우스키퍼 버니스 디스코드 봇
|
|   모듈 선언 및 클라이언트 선언부
 *------------------------------------------------------------------------------------*/

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { createAudioPlayer } = require('@discordjs/voice');

const dailyReportModule = require('./commandModules/dailyReports.js');
const standardModule = require('./commandModules/standard.js');
const timeoutModule = require('./commandModules/timeout.js');
const playMusicModule = require('./commandModules/playMusic.js');
const Utils = require('./serverConfig/configutil.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.MessageContent,
    ]
});

/*------------------------------------------------------------------------------------*
|   변수 설정
|   settingsPath     : 서버별 각 채널 ID등 설정 파일 경로
|   serverSettings   : 설정파일 담을 객체
|   key              : 봇 토큰 [환경변수화 완료]
|   adminID          : 관리자 ID - 봇 셧다운시 권한 확인 [환경변수화 완료]
|   admin            : 관리자 서버 ID
|   audioPlayer      : 유튜브 영상 재생을 위한 플레이어
|   queues           : 각 서버별 플레이리스트를 담을 MAP. 서버별 id가 key가 됨.
|   embedMessageId   : 봇이 보내는 도움말 1차 메시지 ID
 *------------------------------------------------------------------------------------*/
const settingsPath = './serverConfig/settings.json';
const serverSettings = {};

Utils.loadServerSettings(serverSettings, settingsPath);

const key = Utils.getServerSetting(serverSettings, "BASIC", "ENKEY");
const adminID = Utils.getServerSetting(serverSettings, "BASIC", "ADMIN");
const admin = Utils.getServerSetting(serverSettings, "BASIC", "adminServerId");
const Err = Utils.getServerSetting(serverSettings, admin, "adminErr");

const audioPlayer = createAudioPlayer();
audioPlayer.on('error', (error) => {
    console.error('AudioPlayer 오류:', error.message);
    if (error.message.includes('aborted')) { // ECONNRESET 오류 처리
        console.error('연결이 종료되었습니다. :\n', error.message);
        console.error(error);
        return;
    } else {
        // 다른 오류는 여기서 처리
        console.error('기타 오류:', error.message);
        console.error('에러 스택:', error.stack);
        return;
    }
});

const queues = new Map();

let embedMessageId = null;

/*------------------------------------------------------------------------------------*
|   봇 로그인(구동) 시작
 *------------------------------------------------------------------------------------*/

client.login(key);

/*------------------------------------------------------------------------------------*
|   봇이 준비되면 실행됨
 *------------------------------------------------------------------------------------*/

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    try {

        //봇의 액티비티 상태 변경. CUSTOM.
        client.user.setPresence({
            activities: [{ name: `[ >도와줘 ] 를 보내보세요`, type: ActivityType.Custom }],
            status: 'online',
        });

        //출근일지 기록
        dailyReportModule.sendWorkStartMessage(client, serverSettings, admin);

    } catch (error) {
        const errorLog = `${new Date().toISOString()}: \n${error.stack}\n`;

        // 에러로그 채널에 기록
        const errorChannelId = Err;
        const errorChannel = client.channels.cache.get(errorChannelId);
        if (errorChannel) {
            errorChannel.send(`에러가 발생하였습니다.:\n\`\`\`${errorLog}\`\`\``)
                .catch(console.error);
        }
    }

});

/*------------------------------------------------------------------------------------*
|   음성 채널에 누군가 참가하면 state가 바뀜. 그때 발생하는 이벤트 핸들러.
|   config에 설정한 메인 음성채널을 따라서 감지하고 메인 채팅채널에 인사함.
*------------------------------------------------------------------------------------*/

client.on('voiceStateUpdate', (oldState, newState) => {
    try {
        dailyReportModule.sendWelcomeMessage(client, oldState, newState, serverSettings, admin);
    } catch (error) {
        const errorLog = `${new Date().toISOString()}: ${error.stack}\n`;

        // 특정 채팅 채널에 에러 기록
        const errorChannelId = Err;
        const errorChannel = client.channels.cache.get(errorChannelId);
        if (errorChannel) {
            errorChannel.send(`에러가 발생하였습니다.:\n\`\`\`${errorLog}\`\`\``)
                .catch(console.error);
        }
    }
});

/*------------------------------------------------------------------------------------*
|   누군가 메시지를 보낼 때 발생함.
|   function화해서 빼서 사용해도 되긴 하는데 다른곳에 재사용하는일은 거의 없어서
|   그냥 놔둠...
 *------------------------------------------------------------------------------------*/

client.on('messageCreate', async (message) => {
    // 봇이 보낸 메시지는 무시
    if (message.author.bot) return;

    try {

        if (message.content === `hello`) {
            message.reply("안녕하십니까! 자택을 지켜드립니다. 버니스 입니다..");
        }

        //비슷하지만 틀린 명령어를 입력한 경우...
        // 1. 나가기 예약
        if (message.content.startsWith('>퇴장') || message.content.startsWith('>강퇴') || message.content.startsWith(':퇴장') || message.content.startsWith(':나가기')) {
            standardModule.helpMessageSend(message, "goOut");
        }
        // 2. 음악 재생 관련
        if (message.content.startsWith('>play') || message.content.startsWith('>유튜브') || message.content.startsWith('>재생') || message.content === '>노래') {
            standardModule.helpMessageSend(message, "playMusic");
        }
        // 2. 수동 입.퇴장 관련
        if (message.content === '>leave' || message.content === '>LEAVE' || message.content === '>join' || message.content === '>JOIN') {
            standardModule.helpMessageSend(message, "joinleave");
        }


        // 사용자가 /나가기 예약 : [일정 시간 ex)30분] 명령어를 입력했을 때
        if (message.content.startsWith('>나가기 예약')) {
            timeoutModule.setTimeoutUser(message, client);
        }

        if (message.content.startsWith('>노래 틀어라') || message.content.startsWith('>노래 틀어줘')) {
            playMusicModule.playMusic(message, queues, audioPlayer, client);
        }

        if (message.content.startsWith('>시끄러워')) {
            playMusicModule.volumeDown(message, audioPlayer, client);
        }

        if (message.content.startsWith('>안들려')) {
            playMusicModule.volumeUp(message, audioPlayer, client);
        }

        if (message.content === '>리스트 보여줘' || message.content === '>리스트' || message.content === '>플레이리스트') {
            playMusicModule.showMeList(message, queues);
        }
        if (message.content === '>스킵해!' || message.content === '>슈퍼스킵') {
            const voiceChannel = message.member.voice.channel;
            if (voiceChannel) {
                playMusicModule.startSkipVote(message, audioPlayer, client, queues);
            } else {
                message.reply('죄송하지만 노래를 듣고 계신건 맞으십니까?');
                return;
            }

        }

        // 명령어 보기
        if (message.content === '>도와줘' || message.content === '>help' || message.content === '>명령어' || message.content === '>버니스') {
            embedMessageId = await standardModule.sendHelp1(message);
        }

        // 명령어 보기
        if (message.content === '>명령어 짧게') {
            message.reply("봇 참가 : ```>자리에 앉아```\n봇 내보내기 : ```>꺼져```\n퇴장예약 : ```>나가기 예약 : n초/n분/n시간```\n노래틀기 : ```>노래 틀어라 [동영상주소]```");
        }

        // 봇이 보낸 특정 메시지에 대한 답글을 감지합니다.
        if ((message.reference && message.reference.messageId === embedMessageId) || message.content === '>그래도 설명해줘' || message.content === '>그래도 명령어' || message.content === '>명령어 길게') {
            const config = standardModule.getHelpMessageConfig();
            standardModule.sendCustomChEBDMsg("" + message.channel.id, config, client);
        }

        // 음성 채널에 참여
        if (message.content === '>집에 돌아와라' || message.content === '>자리에 앉아') {
            standardModule.botJoin(message);
        }


        // 음성 채널에서 나가기
        if (message.content === '>꺼져' || message.content === '>나가') {
            standardModule.botLeave(message);
        }

        // 봇 셧다운 시키기
        if (message.content === '>셧다운') {
            if (message.author.id === adminID) {
                message.reply('https://app.koyeb.com/apps/6d46c0ef-8aa7-4e45-b60f-c56960649631/services/b2910f27-30e4-4f8e-94d2-df42f4a91e1a/settings/danger-zone');
            } else {
                message.reply('관리자만 저를 죽일 수 있습니다.');
            }

        }

    } catch (error) {
        message.reply('죄송합니다. 에러가 발생하였습니다.');
        const errorLog = `${new Date().toISOString()}: ${error.stack}\n`;

        // 특정 채팅 채널에 에러 기록
        const errorChannelId = Err;
        const errorChannel = client.channels.cache.get(errorChannelId);
        if (errorChannel) {
            errorChannel.send(`에러가 발생하였습니다.:\n\`\`\`${errorLog}\`\`\``)
                .catch(console.error);
        }
        return;
    }


});




