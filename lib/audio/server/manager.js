/**
 *
 * Reldens - AudioManager
 *
 */

const { AudioConst } = require('../constants');
const { sc, Logger} = require('@reldens/utils');

class AudioManager
{

    constructor(props)
    {
        this.categories = {};
        this.globalAudios = {};
        this.roomsAudios = {}; // each room id will have its own array of audios
        this.roomsManager = props.roomsManager;
        this.dataServer = props.dataServer;
        this.setRepositories();
    }

    setRepositories()
    {
        if(!this.dataServer){
            Logger.error('DataServer undefined in AudioManager.');
            return false;
        }
        this.audioRepository = this.dataServer.getEntity('audio');
        this.audioPlayerConfigModelRepository = this.dataServer.getEntity('audioPlayerConfigModel');
        this.audioCategoriesRepository = this.dataServer.getEntity('audioCategories');
    }

    async loadAudioCategories()
    {
        // @TODO - BETA - Include config fields in audio categories table.
        this.categories = await this.audioCategoriesRepository.loadBy('enabled', 1);
    }

    async loadGlobalAudios()
    {
        if(0 === Object.keys(this.globalAudios).length){
            let loadedGlobalAudios = await this.audioRepository.loadWithRelations(
                {room_id: null, enabled: 1},
                ['related_audio_categories', 'related_audio_markers']
            );
            this.globalAudios = sc.convertObjectsArrayToObjectByKeys(
                this.convertAudiosConfigJsonToObjects(loadedGlobalAudios),
                'audio_key'
            );
        }
        return this.globalAudios;
    }

    convertAudiosConfigJsonToObjects(loadedGlobalAudios)
    {
        for(let audio of loadedGlobalAudios){
            if(audio.config){
                let convertedData = sc.toJson(audio.config);
                if(convertedData){
                    audio.config = convertedData;
                }
            }
            if(audio.related_audio_markers){
                for(let marker of audio.related_audio_markers){
                    if(marker.config){
                        let convertedData = sc.toJson(marker.config);
                        if(convertedData){
                            marker.config = convertedData;
                        }
                    }
                }
            }
        }
        return loadedGlobalAudios;
    }

    async loadRoomAudios(roomId)
    {
        if(!sc.hasOwn(this.roomsAudios, roomId)){
            let loadedRoomAudios = await this.audioRepository.loadWithRelations(
                {room_id: roomId, enabled: 1},
                ['related_rooms', 'related_audio_categories', 'related_audio_markers']
            );
            this.roomsAudios[roomId] = sc.convertObjectsArrayToObjectByKeys(
                this.convertAudiosConfigJsonToObjects(loadedRoomAudios),
                'audio_key'
            );
        }
        return this.roomsAudios[roomId];
    }

    async loadAudioPlayerConfig(playerId)
    {
        // @TODO - BETA - Improve login performance, avoid query by getting config from existent player schema.
        let configModels = await this.audioPlayerConfigModelRepository.loadBy('player_id', playerId);
        if(0 === configModels.length){
            return {};
        }
        let playerConfig = {};
        for(let config of configModels) {
            playerConfig[config['category_id']] = config['enabled'];
        }
        return playerConfig;
    }

    async executeMessageActions(client, message, room)
    {
        if(message.act !== AudioConst.AUDIO_UPDATE){
            return false;
        }
        let currentPlayer = room.playerBySessionIdFromState(client.sessionId);
        let audioCategory = await this.audioCategoriesRepository.loadOneBy(
            'category_key',
            message[AudioConst.MESSAGE.DATA.UPDATE_TYPE]
        );
        if(!currentPlayer || currentPlayer.playerId || !audioCategory){
            return false;
        }
        let filters = {
            player_id: currentPlayer.player_id,
            category_id: audioCategory.id
        };
        let playerConfig = await this.audioPlayerConfigModelRepository.loadOne(filters);
        let updatePatch = {enabled: (message[AudioConst.MESSAGE.DATA.UPDATE_VALUE] ? 1 : 0)};
        if(playerConfig){
            return await this.audioPlayerConfigModelRepository.update(filters, updatePatch);
        }
        return await this.audioPlayerConfigModelRepository.createWithRelations(Object.assign(updatePatch, filters));
    }

    hotPlugAudio(options)
    {
        if(options?.newAudioModel?.room_id){
            return this.hotPlugGlobalAudio(options?.newAudioModel);
        }
        return this.hotPlugRoomAudio(options?.newAudioModel);
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
        roomInstance.broadcast('*', {act: AudioConst.AUDIO_UPDATE, roomId, audios: [newAudioModel]});
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
        if(newAudioModel.room_id){
            return this.hotUnplugRoomAudio(newAudioModel, id);
        }
        return this.hotUnplugGlobalAudio(newAudioModel, id);
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
