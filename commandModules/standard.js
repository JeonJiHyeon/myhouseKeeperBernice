// standard.js


const { MessageEmbed } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    sendHelp1: async function (message) {
        const sentMessage = await message.reply('저를 만들어주신 왜용님께 여쭤보시는 것이 빠릅니다만... 들으시겠습니까?\n간략화 설명버전 : [ >명령어 짧게 ]\n상세한 설명버전 : 이 메시지에 답장, 혹은 [ >그래도 설명해줘 ]');
        return sentMessage.id; // 전송된 메시지의 ID를 기억합니다.
    },

    //도움말 내용 수정하려면 아래 메소드에서 config수정.
    //코드 블럭(```) 사용 안하면, 접미에 \n\u200B 넣어주고, 사용하면 \u200B 만 넣어주기
    getHelpMessageConfig: function () {
        const config = {
            title: "🎀 자택관리원 버니스 사용법 🎀\n< 저자 : 왜용이 >",
            desc: "지금부터 제가 제작한 봇, '자택관리원 버니스'에 대해 말씀드리겠습니다!\n기본적으로, 접두사(명령어 어미)는 '>'기호를 쓰며 띄어쓰지 않습니다!!\n예시 : [>꺼져]\n\u200B\n",
            fields: [
                {
                    name: '✅ 봇이 켜질 때 작동하는 기능',
                    value: '\\- 출퇴근일지에 출퇴근 시각 기록하기\n\u200B',
                    inline: false
                },
                {
                    name: '✅ 입장/퇴장시 인사해주는 기능',
                    value: '\\- 관리자가 설정한 음성채널의 입퇴장을 감지하여, 사전에 설정한 채팅채널에 인사를 보냅니다.\n\u200B',
                    inline: false
                },
                {
                    name: '✅ 봇을 음성채널에 수동으로 참가',
                    value: '\\- 명령어 : \n```>자리에 앉아``````>집에 돌아와라```',
                    inline: true

                },
                {
                    name: '✅ 봇을 음성채널에서 수동으로 퇴장',
                    value: '\\- 명령어 : \n```>꺼져``````>나가```\u200B',
                    inline: true

                },
                {
                    name: '✅ N [단위] 의 시간이 지나면, 메세지 보낸 사람의 음성 연결을 끊는 기능.',
                    value: '\\- 명령어 : N=숫자, [단위]=시간단위.\n```>나가기 예약 : N[단위]\n예)>나가기 예약 : 3초```\u200B',
                    inline: false

                },
                {
                    name: '✅ 유튜브 동영상 url을 이용하여 노래를 재생하는 기능.',
                    value: '\\- 명령어 : \n```>노래 틀어라 : [유튜브 동영상 주소]```\u200B',
                    inline: false

                },
                {
                    name: '✅ (노래가 재생 중일 때) 현재 예약된 노래 목록을 보여주는 기능',
                    value: '\\- 명령어 : \n```>리스트 보여줘```\u200B',
                    inline: true

                },
                {
                    name: '✅ (노래가 재생 중일 때) 현재 재생중인 노래 스킵하는 기능 [투표제]',
                    value: '\\- 명령어 : \n```>스킵해!```',
                    inline: true

                },
                {
                    name: '✅ 업데이트 예정 기능 목록',
                    value: '\\- 노래 스킵 투표제(3인 이상 테스트 필요)\n\\-24시간 봇 가동(서버호스팅)\n\\-전적검색\n(1순위 : 롤/롤체. API잘되어있을것같음 2순위 : 이터널리턴 3순위 : 메이플 4순위 : 기타게임. 찾아봐야함)\n\\-파일 입출력으로 설정값 저장/수정/삭제',
                    inline: false

                }]
            ,
            footer: "꼭! 넣고싶은 기능이 있으면 왜용이에게 보내주세요. 버그나 그런것도요..."
        }

        return config;
    },

    //사용자가 잘못된 명령어를 입력했을 때.
    helpMessageSend: function (message, type) {
        //나가기 예약의 경우
        if (type == "goOut") {
            message.reply('올바른 명령어를 입력 해 주세요.\n```>나가기 예약 : n초/n분/n시간 中 택1```');
            return;
        }
        if (type == "playMusic") {
            message.reply('올바른 명령어를 입력 해 주세요.\n```>노래 틀어라 [유튜브 동영상 주소]```');
            return;
        }
        if (type == "joinleave") {
            message.reply('올바른 명령어를 입력 해 주세요.\n```>자리에 앉아\n>꺼져```');
            return;
        }
    },
    botJoin: function (message) {
        const voiceChannel = message.member.voice.channel;
        if (voiceChannel) {
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            })
            message.reply('네, 알겠습니다.');
            console.log(`Joined ${voiceChannel.name}`);
            return;
        } else {
            message.reply('죄송하지만 어떤 채널인지 모르기 때문에 음성 채널에 참여 부탁드립니다.');
            return;
        }
    },

    botLeave: function (message) {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            message.reply('네, 알겠습니다.');
            console.log('Leave Channel');
            connection.destroy();
            return;
        } else {
            message.reply('\n장보러 나갔어요\n\n\n\n\t\t\t\t\t\t\t-버니스-\n');
            return;
        }
    },
    sendCustomChMsg: function (CHid, sendmsg, client) {
        const channel = client.channels.cache.get(CHid);
        if (channel) {
            channel.send(sendmsg);
        } else {
            console.error('error');
        }
    },
    sendCustomChEBDMsg: function (CHid, config, client) {
        /*
            let Obj = {
              name: "user",
              password: "asdf1234",
            }
    
            오브젝트 형태로 config 넣고, Obj.key 하면 바로 value
        */
        const channel = client.channels.cache.get(CHid);
        const title = config.title;
        const desc = config.desc;
        const fields = config.fields;
        const footer = config.footer;

        if (channel) {
            const embed = {
                color: 0xFF007F,
                title: title,
                description: desc,
                fields: fields,
                footer: { text: footer },
            };

            channel.send({ embeds: [embed] });


        } else {
            console.error('error');
        }
    },
    sendErrorLog: function (CHid, config, client) {
        /*
            let Obj = {
              name: "user",
              password: "asdf1234",
            }
    
            오브젝트 형태로 config 넣고, Obj.key 하면 바로 value
        */
        const channel = client.channels.cache.get(CHid);
        const title = config.title;
        const desc = config.desc;
        const fields = config.fields;
        const footer = config.footer;

        if (channel) {
            const embed = {
                color: 0xFF007F,
                title: title,
                description: desc,
                fields: fields,
                footer: { text: footer },
            };

            channel.send({ embeds: [embed] });


        } else {
            console.error('error');
        }
    },



    // 다른 standard 모듈 함수들...
};
