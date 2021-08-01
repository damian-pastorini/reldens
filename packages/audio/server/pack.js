/**
 *
 * Reldens - Audio Server Package
 *
 */

const { PackInterface } = require('../../features/pack-interface');
const { Logger, sc } = require('@reldens/utils');
const { AudioManager } = require('./manager');
const { AudioConst } = require('../constants');

class AudioPack extends PackInterface
{

    constructor()
    {
        super();
        this.audioManager = false;
    }

    setupPack(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AudioPack.');
        }
        this.events.on('reldens.serverBeforeDefineRooms', async (props) => {
            this.audioManager = new AudioManager();
            await this.audioManager.loadAudioCategories();
            await this.audioManager.loadGlobalAudios();
            props.serverManager.audioManager = this.audioManager;
        });
        this.events.on('reldens.defineRoomsInGameServerDone', (roomsManager) => {
            let definedRoomsNames = Object.keys(roomsManager.definedRooms);
            if(definedRoomsNames.length){
                for(let roomName of definedRoomsNames){
                    let definedRoomData = roomsManager.definedRooms[roomName];
                    if(!definedRoomData.roomProps.roomData || !definedRoomData.roomProps.roomData.roomId){
                        continue;
                    }
                    this.audioManager.loadRoomAudios(definedRoomData.roomProps.roomData.roomId);
                }
            }
        });
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.beforeSuperInitialGameData', (superInitialGameData, serverManager) => {
            superInitialGameData.audio = {
                global: this.audioManager.globalAudios
            };
        });
        this.events.on('reldens.createPlayerAfter', (client, authResult, currentPlayer, roomScene) => {
            roomScene.send(client, {
                act: AudioConst.AUDIO_UPDATE,
                roomId: roomScene.roomData.roomId,
                audios: this.audioManager.roomsAudios[roomScene.roomData.roomId],
                categories: this.audioManager.categories
            });
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.audio = this.audioManager;
        });
    }

}

module.exports.AudioPack = AudioPack;
