/**
 *
 * Reldens - AudioManager
 *
 */

const { AudioConst } = require('../constants');
const { sc } = require('@reldens/utils');

class AudioManager
{

    constructor(props)
    {
        this.categories = {};
        this.globalAudios = {};
        this.roomsAudios = {}; // each room id will have its own array of audios
        this.roomsManager = props.roomsManager;
        this.dataServer = props.dataServer;
    }

    async loadAudioCategories()
    {
        this.categories = await this.dataServer.getEntity('audioCategories').loadBy('enabled', 1);
    }

    async loadGlobalAudios()
    {
        if(0 === Object.keys(this.globalAudios).length){
            let loadedGlobalAudios = await this.dataServer.getEntity('audio').loadWithRelations(
                {room_id: null, enabled: 1},
                ['category', 'markers']
            );
            this.globalAudios = sc.convertObjectsArrayToObjectByKeys(loadedGlobalAudios, 'audio_key');
        }

        return this.globalAudios;
    }

    async loadRoomAudios(roomId)
    {
        if(!sc.hasOwn(this.roomsAudios, roomId)){
            let loadedRoomAudios = await this.dataServer.getEntity('audio').loadWithRelations(
                {room_id: roomId, enabled: 1},
                ['parent_room', 'category', 'markers']
            );
            this.roomsAudios[roomId] = sc.convertObjectsArrayToObjectByKeys(loadedRoomAudios, 'audio_key');
        }
        return this.roomsAudios[roomId];
    }

    async loadAudioPlayerConfig(playerId)
    {
        let configModels = await this.dataServer.getEntity('audioPlayerConfigModel').loadBy('player_id', playerId);
        let playerConfig = {};
        if(configModels.length > 0){
            for(let config of configModels){
                playerConfig[config['category_id']] = config['enabled'];
            }
        }
        return playerConfig;
    }

    async executeMessageActions(client, message, room)
    {
        if(message.act !== AudioConst.AUDIO_UPDATE){
            return false;
        }
        let currentPlayer = room.playerBySessionIdFromState(client.sessionId);
        let audioCategory = await this.dataServer.getEntity('audioCategories').loadOneBy(
            'category_key',
            message[AudioConst.MESSAGE.DATA.UPDATE_TYPE]
        );
        if(!currentPlayer || currentPlayer.playerId || !audioCategory){
            return false;
        }
        let audioPlayerConfigModel = this.dataServer.getEntity('audioPlayerConfigModel');
        let filters = {
            player_id: currentPlayer.player_id,
            category_id: audioCategory.id
        };
        let playerConfig = await audioPlayerConfigModel.loadOne(filters);
        let updatePatch = {enabled: (message[AudioConst.MESSAGE.DATA.UPDATE_VALUE] ? 1 : 0)};
        playerConfig
            ? await audioPlayerConfigModel.update(filters, updatePatch)
            : await audioPlayerConfigModel.createWithRelations(Object.assign(updatePatch, filters));
    }

    hotPlugAudio(options)
    {
        let { newAudioModel } = options;
        !newAudioModel.room_id ? this.hotPlugGlobalAudio(newAudioModel) : this.hotPlugRoomAudio(newAudioModel);
    }

    hotPlugRoomAudio(newAudioModel)
    {
        let roomId = newAudioModel.room_id;
        if(!sc.hasOwn(this.roomsAudios, roomId)){
            this.roomsAudios[roomId] = {};
        }
        this.roomsAudios[roomId][newAudioModel.id] = newAudioModel;
        let roomInstance = this.findRoom(roomId, this.roomsManager.createdInstances);
        if(!roomInstance){
            // @NOTE: since the room could not be created yet (because none is connected), we don't need to broadcast
            // the new audio, it will be loaded automatically when the room is created.
            return true;
        }
        let data = {
            act: AudioConst.AUDIO_UPDATE,
            roomId,
            audios: [newAudioModel]
        };
        roomInstance.broadcast('*', data);
    }

    hotPlugGlobalAudio(newAudioModel)
    {
        this.globalAudios[newAudioModel.id] = newAudioModel;
        let createdRooms = Object.keys(this.roomsManager.createdInstances);
        if(0 === createdRooms.length){
            return false;
        }
        for(let i of createdRooms){
            let roomInstance = this.roomsManager.createdInstances[i];
            let broadcastData = {
                act: AudioConst.AUDIO_UPDATE,
                roomId: i,
                audios: {}
            };
            broadcastData['audios'][newAudioModel.id] = newAudioModel;
            roomInstance.broadcast('*', broadcastData);
        }
    }

    hotUnplugAudio(props)
    {
        let {newAudioModel, id} = props;
        newAudioModel.room_id ? this.hotUnplugRoomAudio(newAudioModel, id) : this.hotUnplugGlobalAudio(newAudioModel, id);
    }

    hotUnplugRoomAudio(newAudioModel, id)
    {
        let roomAudiosList = sc.get(this.roomsAudios, newAudioModel.room_id, false);
        if(false !== roomAudiosList && sc.hasOwn(roomAudiosList, id)){
            delete this.roomsAudios[newAudioModel.room_id][id];
        }
        let roomInstance = this.findRoom(newAudioModel.room_id, this.roomsManager.createdInstances);
        if(!roomInstance){
            return true;
        }
        let data = {
            act: AudioConst.AUDIO_DELETE,
            roomId: newAudioModel.room_id,
            audios: {}
        };
        data['audios'][newAudioModel.id] = newAudioModel;
        roomInstance.broadcast('*', data);
    }

    hotUnplugGlobalAudio(newAudioModel, id)
    {
        delete this.globalAudios[id];
        let createdRooms = Object.keys(this.roomsManager.createdInstances);
        if(0 === createdRooms.length){
            return false;
        }
        for(let i of createdRooms){
            let roomInstance = this.roomsManager.createdInstances[i];
            let broadcastData = {
                act: AudioConst.AUDIO_DELETE,
                roomId: i,
                audios: {}
            };
            broadcastData['audios'][newAudioModel.id] = newAudioModel;
            roomInstance.broadcast('*', broadcastData);
        }
    }

    findRoom(roomId, instancesList = {})
    {
        let roomInstances = Object.keys(instancesList);
        if(0 === roomInstances.length){
            return false;
        }
        for(let i of roomInstances){
            let room = instancesList[i];
            if(!room.roomData){
                continue;
            }
            if(room.roomData.roomId === roomId){
                return room;
            }
        }
        return false;
    }

}

module.exports.AudioManager = AudioManager;
