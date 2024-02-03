// welcome.js

const standardModule = require('./standard.js');
const Utils = require('../serverConfig/configutil.js');

module.exports = {
    sendWorkStartMessage: function (client, serverSettings, admin) {
        // 한국 표준시로 현재 날짜와 시간 얻기
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const dailyReportChannelId = Utils.getServerSetting(serverSettings, admin, "workerChannel");
        const channel = client.channels.cache.get(dailyReportChannelId);

        if (channel) {
            const date = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 `;
            const time = `${today.getHours().toString().padStart(2, '0')} : ${today.getMinutes().toString().padStart(2, '0')} : ${today.getSeconds().toString().padStart(2, '0')} , `;

            channel.send({ content: `${date}${time}홈키퍼 버니스 출근했습니다.` });
            console.log('출근일지 기록 완.');

        } else {
            throw new Error("출근일지 채널을 찾지 못하였습니다.");
        }
    },
    sendWelcomeMessage: function (client, oldState, newState, serverSettings, admin) {
        if (newState.member.displayName === "홈키퍼버니스" || oldState.member.displayName === "홈키퍼버니스") {
            return;
        }

        const doki_voice = Utils.getServerSetting(serverSettings, admin, "mainVoiceChannel");
        const doki = Utils.getServerSetting(serverSettings, admin, "mainChatChannel");

        if (!oldState.channelId && newState.channelId === doki_voice) {
            const members = newState.channel.members;
            let memberNames_arr = members.map(member => member.displayName);
            memberNames_arr = memberNames_arr.filter((element) => element !== newState.member.displayName);
            memberNames_arr = memberNames_arr.filter((element) => element !== "홈키퍼버니스");
            const memberNames = memberNames_arr.join('님, ');

            let message = '';
            // 이미 있는 사람이 봇 제외하고 1명
            if (memberNames_arr.length == 1) {
                message = `\`\`\`어서오십시오 ${newState.member.displayName}님. [ ${memberNames} ] 님 께서 기다리고 계셨습니다.\`\`\``;
            }
            // 이미 있는 사람이 봇 제외하고 1명이상
            else if (memberNames_arr.length > 1) {
                message = `\`\`\`어서오십시오 ${newState.member.displayName}님. [ ${memberNames} ] 님들 께서 기다리고 계셨습니다.\`\`\``;
            }
            // 0명
            else {
                message = `\`\`\`어서오십시오 ${newState.member.displayName}님. 자택관리원 버니스가 오늘도 잘 지키고 있었습니다.\`\`\``;
            }
            standardModule.sendCustomChMsg(doki, message, client);

        } else if (oldState.channelId === doki_voice && !newState.channelId) {
            const message = client.channels.cache.get(doki_voice).members.size
                ? `\`\`\`안녕히 가십시오. ${oldState.member.displayName}님\`\`\`` // 남은 사람이 있을 때
                : `\`\`\`안녕히 가십시오. ${oldState.member.displayName}님.\n이 버니스가 뒷정리 하겠습니다. 모두 좋은 시간이셨길 바랍니다.\`\`\``;

            standardModule.sendCustomChMsg(doki, message, client);
        }
    },
    // 다른 welcome 모듈 함수들...
};
