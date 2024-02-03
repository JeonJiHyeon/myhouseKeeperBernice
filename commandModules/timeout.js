// timeout.js
const standardModule = require('./standard.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

//초, 분, 시간 밀리초정의
const millisec = { "초": 1000, "분": 60000, "시간": 3600000 };

module.exports = {
    setTimeoutUser: function (message, client) {
        // 명령어에서 시간 추출 - trim 공백제거
        message.content = message.content.trim();
        let args = message.content.split(':');

        //단위 추출
        let time_filter = "" + args[1].substr(-1);

        //마지막 단위 제거
        let real_arg;

        if (time_filter == "간") {
            time_filter = args[1].substr(-2) + args[1].substr(-1);
            real_arg = args[1].slice(0, -2);
        }
        else {
            real_arg = args[1].slice(0, -1);
        }
        //추출한 단위와 시간의 유효성 검사
        if (!(time_filter == "초") && !(time_filter == "분") && !(time_filter == "시간")) {
            message.reply('유효한 시간 단위가 아닙니다. 아래처럼 입력해주세요. \n>나가기 예약 : 30초 | >나가기 예약 : 30분 | >나가기 예약 : 30시간');
            return;
        }
        const timeNumbers = parseInt(real_arg, 10);

        if (!isNaN(timeNumbers) && timeNumbers > 0) {
            standardModule.botJoin(message);
            const connection = getVoiceConnection(message.guild.id);
            
            if (connection) {
                setTimeout(() => {
                    const currentChannel = "" + connection.joinConfig.channelId;
                    const channel = client.channels.cache.get(`${currentChannel}`);
                    if (channel.members.has(message.author.id)) {
                        message.member.voice.disconnect();
                        console.log(`Disconnected ${message.author.username} after ${timeNumbers} ${time_filter} .`);
                    }
                }, timeNumbers * millisec[`${time_filter}`]);

                message.reply(`${message.author.username} 님을 ${timeNumbers} ${time_filter} 이후에 저승으로 보내드립니다.`);

                return;

            } else {
                message.reply('음성 채널 연결 실패로 저승에 보내드리지 못할 것 같습니다...');
                return;
            }
        } else {
            message.reply('유효한 시간을 입력해 주십시오. 예시 들어드립니다: `>나가기 예약 : 30분`');
            return;
        }
    },

    // 다른 welcome 모듈 함수들...
};