/**
 *
 * Reldens - Audio Server Package
 *
 */

const { PackInterface } = require('../../features/pack-interface');
const { AudioManager } = require('./manager');
const { AudioConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class AudioPack extends PackInterface
{

    constructor()
    {
        super();
        this.audioManager = false;
    }

    setupPack(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AudioPack.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in AudioPack.');
        }
        this.events.on('reldens.serverBeforeDefineRooms', async (props) => {
            this.audioManager = new AudioManager({
                roomsManager: props.serverManager.roomsManager,
                dataServer: this.dataServer
            });
            await this.audioManager.loadAudioCategories();
            await this.audioManager.loadGlobalAudios();
            props.serverManager.audioManager = this.audioManager;
        });
        this.events.on('reldens.defineRoomsInGameServerDone', async (roomsManager) => {
            let definedRoomsNames = Object.keys(roomsManager.definedRooms);
            if(definedRoomsNames.length){
                for(let roomName of definedRoomsNames){
                    let definedRoomData = roomsManager.definedRooms[roomName];
                    if(!definedRoomData.roomProps.roomData || !definedRoomData.roomProps.roomData.roomId){
                        continue;
                    }
                    await this.audioManager.loadRoomAudios(definedRoomData.roomProps.roomData.roomId);
                }
            }
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.beforeSuperInitialGameData', (superInitialGameData, serverManager) => {
            superInitialGameData.audio = {globalAudios: this.audioManager.globalAudios};
        });
        this.events.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, roomScene) => {
            let playerConfig = await this.audioManager.loadAudioPlayerConfig(currentPlayer.player_id);
            let data = {
                act: AudioConst.AUDIO_UPDATE,
                roomId: roomScene.roomData.roomId,
                audios: this.audioManager.roomsAudios[roomScene.roomData.roomId],
                categories: this.audioManager.categories,
                playerConfig: playerConfig
            };
            roomScene.send(client, data);
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.audio = this.audioManager;
        });
    }

}

module.exports.AudioPack = AudioPack;
