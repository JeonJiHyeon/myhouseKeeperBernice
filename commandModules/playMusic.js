// playMusic.js
const standardModule = require('./standard.js');
const { createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

/*-----------------------------------------------------------------------------------------------------
|   1개의 서버에서 이용할 것이긴 하지만 아닐 수도 있기 때문에 배열형태의 큐가 아니라, MAP으로 사용
|   모듈 밖에서 var TotalQueue = new Map(); 하고, TotalQueue를 Serverqueues로 받음
|   Serverqueues.set(message.guild.id, []); 이건 앞이 키값으로 서버아이디가 들어감.
*------------------------------------------------------------------------------------------------------*/

module.exports = {
    playMusic: async function (message, Serverqueues, audioPlayer, client) {
        var connection = getVoiceConnection(message.guild.id);
        if (!connection) {
            standardModule.botJoin(message);
            connection = getVoiceConnection(message.guild.id);
        }

        if (connection) {
            const currentChannel = "" + connection.joinConfig.channelId;
            const channel = client.channels.cache.get(`${currentChannel}`);

            const url = message.content.slice('>노래 틀어라'.length).trim();

            if (!url) {
                throw new Error("유튜브 동영상 주소를 찾지 못하였습니다! 다시 입력해주세요.");
                return;

            }
            const stream = ytdl(url, {
                filter: 'audioonly',
                fmt: "mp3",
                highWaterMark: 1 << 62,
                liveBuffer: 1 << 62,
                dlChunkSize: 0,
                bitrate: 128,
                quality: "lowestaudio",
            });

            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title;

            const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, metadata: { title: title, url: url } });

            if (!audioPlayer) {
                audioPlayer = createAudioPlayer();

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

                connection.subscribe(audioPlayer);
            } else {
                connection.subscribe(audioPlayer);
            }

            if (audioPlayer.state.status === AudioPlayerStatus.Playing) {
                // 이미 재생중이라면 큐에 추가 없으면 Map에 추가부터 함.
                if (!Serverqueues.has(message.guild.id)) {
                    Serverqueues.set(message.guild.id + "", []);
                }
                const queue = Serverqueues.get(message.guild.id + "");
                queue.push(resource);
                message.reply('큐에 추가하였습니다.');
                return;

            } else { //노래를 재생중이지 않는 경우에는 그냥 바로 재생해버림
                audioPlayer.play(resource);
                message.reply('노래를 불러드립니다. 제목은 ' + title);
            }

            audioPlayer.on(AudioPlayerStatus.Idle, async () => {
                const queue = Serverqueues.get(message.guild.id + "");
                if (!queue) {
                    throw new Error("재생목록이 존재하지 않거나, 오류가 발생하였습니다.");
                    return;
                }
                const nextResource = queue.shift();

                if (nextResource) {
                    audioPlayer.play(nextResource);
                    message.reply('노래를 불러드립니다. 제목은 ' + nextResource.metadata.title);
                } else {
                    message.reply('재생목록에 노래가 없습니다.');
                    return;
                }
            });
        } else {
            message.reply('음성 채널 연결 실패로 노래를 불러드리지 못할 것 같습니다...');
        }
    },
    volumeDown: function (message, audioPlayer, client) {
        message.reply(`죄송합니다. 지원하지 않는 기능입니다. [ 명령어 : >시끄러워 ]`);
    },
    volumeUp: function (message, audioPlayer, client) {
        message.reply(`죄송합니다. 지원하지 않는 기능입니다. [ 명령어 : >안들려 ]`);
    },
    showMeList: function (message, queues) {
        if (queues.has(message.guild.id)) {
            const queue = queues.get(message.guild.id);
            const queueList = queue.map((resource, index) => `**${index + 1}.** [${resource.metadata.title}](${resource.metadata.url})`);
            message.reply({
                embeds: [{
                    title: '현재 큐에 있는 음악 목록',
                    description: queueList.join('\n'),
                    color: '000',
                }],
            });
        } else {
            message.reply('현재 큐에 음악이 없습니다.');
        }
    },
    startSkipVote: async function (message, audioPlayer, client, queues) {
        const queue = queues.get(message.guild.id);
        if (queue) {
            const voiceChannel = message.member.voice.channel;
            const voiceChannelMembers = voiceChannel.members.size - 1; // 봇을 제외한 인원 수
            if (voiceChannelMembers < 3 || message.content === '>슈퍼스킵') {
                // 음성 채널에 3명 미만이면 투표를 받지 않음
                if (audioPlayer.state.status === AudioPlayerStatus.Playing) audioPlayer.unpause();
                audioPlayer.stop();

                message.reply('인원 수가 3명 미만이라 투표를 받지 않고 노래를 스킵했습니다.');

                // 다음 노래 재생
                const nextResource = queue.shift();

                if (nextResource) {
                    audioPlayer.play(nextResource);
                    message.reply('노래를 불러드립니다. 제목은 ' + nextResource.metadata.title);
                } else {
                    message.reply('재생목록에 노래가 없습니다.');
                    return;
                }

            }
            else {
                // 음성 채널에 3명 이상이면 투표를 받음
                const requiredVotes = Math.ceil(voiceChannelMembers / 2); // 과반수 이상의 투표가 필요
                const votes = new Set();
                votes.add(message.author.id);

                const filter = (reaction, user) => {
                    return reaction.emoji.name === '⏭️' && voiceChannel.members.has(user.id) && !votes.has(user.id);
                };

                const collector = message.createReactionCollector({ filter, time: 15000 }); // 15초 동안 투표 가능

                // 투표를 받기 위해 이모지 추가
                await message.react('⏭️');
                message.reply(`투표를 시작합니다. 15초 안에 ⏭️ 이모지를 눌러 투표해주세요.`);

                collector.on('collect', (reaction, user) => {
                    votes.add(user.id);

                    if (votes.size >= requiredVotes) {
                        collector.stop();
                    } else {
                        message.reply(`표추가!`);
                    }

                });

                collector.on('end', (collected) => {
                    if (votes.size < requiredVotes) {
                        message.reply('투표가 부족하여 노래 스킵이 취소되었습니다.');
                        return;
                    }

                    if (audioPlayer.state.status === AudioPlayerStatus.Playing) audioPlayer.unpause();
                    audioPlayer.stop();

                    message.reply('투표로 노래를 스킵했습니다.');

                    // 다음 노래 재생
                    const nextResource = queue.shift();

                    if (nextResource) {
                        audioPlayer.play(nextResource);
                        message.reply('노래를 불러드립니다. 제목은 ' + nextResource.metadata.title);
                    } else {
                        message.reply('재생목록에 노래가 없습니다.');
                        return;
                    }
                });


            }

        } else {
            message.reply('현재 큐에 음악이 없습니다.');
        }
    },
    // 다른 standard 모듈 함수들...
};