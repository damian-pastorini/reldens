/**
 *
 * Reldens - Audio Server Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { AudioManager } = require('./manager');
const { AudioConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class AudioPlugin extends PluginInterface
{

    constructor()
    {
        super();
        this.audioManager = false;
    }

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AudioPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in AudioPlugin.');
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
        this.events.on('reldens.beforeSuperInitialGameData', (superInitialGameData) => {
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
            client.send('*', data);
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.audio = this.audioManager;
        });
    }

}

module.exports.AudioPlugin = AudioPlugin;
