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
        this.globalAudios = []; // an array of global audios
        this.roomsAudios = {}; // each room id will have it's own array of audios
        this.roomsManager = props.roomsManager;
        this.dataServer = props.dataServer;
    }

    async loadAudioCategories()
    {
        this.categories = await this.dataServer.getEntity('audioCategories').loadBy('enabled', 1);
    }

    async loadGlobalAudios()
    {
        if(!Object.keys(this.globalAudios).length){
            this.globalAudios = await this.dataServer.getEntity('audio').loadWithRelations(
                {room_id: null, enabled: 1},
                ['category', 'markers']
            );
        }
        return this.globalAudios;
    }

    async loadRoomAudios(roomId)
    {
        if(!sc.hasOwn(this.roomsAudios, roomId)){
            this.roomsAudios[roomId] = await this.dataServer.getEntity('audio').loadWithRelations(
                {room_id: roomId, enabled: 1},
                ['parent_room', 'category', 'markers']
            );
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

    // eslint-disable-next-line no-unused-vars
    async parseMessageAndRunActions(client, message, room, playerSchema)
    {
        if(message.act !== AudioConst.AUDIO_UPDATE){
            return false;
        }
        let currentPlayer = room.getPlayerFromState(client.sessionId);
        let audioCategory = await this.dataServer.getEntity('audioCategories').loadOneBy('category_key', message.ck);
        if(!currentPlayer || currentPlayer.playerId || !audioCategory){
            return false;
        }
        let updatePatch = {
            player_id: currentPlayer.player_id,
            category_id: audioCategory.id,
            enabled: (message.up ? 1 : 0)
        };
        let playerConfig = await this.dataServer.getEntity('audioPlayerConfigModel').loadOneBy({
            player_id: currentPlayer.player_id,
            category_id: audioCategory.id
        });
        if(playerConfig){
            await this.dataServer.getEntity('audioPlayerConfigModel').update(
                {player_id: currentPlayer.player_id, category_id: audioCategory.id},
                {enabled: (message.up ? 1 : 0)}
            );
        } else {
            await this.dataServer.getEntity('audioPlayerConfigModel').createWithRelations(updatePatch);
        }
    }

    hotPlugNewAudio(options)
    {
        let { newAudioModel } = options;
        let roomId = newAudioModel.room_id;
        !roomId && newAudioModel.enabled
            ? this.hotPlugGlobalAudio(newAudioModel)
            : this.hotPlugRoomAudio(roomId, newAudioModel);
    }

    hotPlugRoomAudio(roomId, newAudioModel)
    {
        if(!sc.hasOwn(this.roomsAudios, roomId)){
            this.roomsAudios[roomId] = [];
        }
        this.roomsAudios[roomId].push(newAudioModel);
        let roomInstance = this.findRoom(roomId, this.roomsManager.createdInstances);
        if(!roomInstance){
            // @NOTE: since the room could not be created yet (because none is connected), we don't need to broadcast
            // the new audio, it will be loaded automatically when the room is created.
            return true;
        }
        let data = {
            act: AudioConst.AUDIO_UPDATE,
            roomId: roomId,
            audios: [newAudioModel]
        };
        roomInstance.broadcast(data);
    }

    hotPlugGlobalAudio(newAudioModel)
    {
        this.globalAudios.push(newAudioModel);
        let createdRooms = Object.keys(this.roomsManager.createdInstances);
        if(0 === createdRooms.length){
            return false;
        }
        for(let i of createdRooms){
            let roomInstance = this.roomsManager.createdInstances[i];
            let broadcastData = {
                act: AudioConst.AUDIO_UPDATE,
                roomId: i,
                audios: [newAudioModel]
            };
            roomInstance.broadcast(broadcastData);
        }
    }

    hotUnplugAudio(props)
    {
        let {newAudioModel, id} = props;
        let roomId = newAudioModel.room_id;
        roomId ? this.hotUnplugRoomAudio(roomId, newAudioModel, id) : this.hotUnplugGlobalAudio(newAudioModel, id);
    }

    hotUnplugRoomAudio(roomId, newAudioModel, id)
    {
        let roomAudios = this.roomsAudios[newAudioModel.room_id];
        for(let audio of roomAudios){
            if(audio.id === id){
                roomAudios.splice(roomAudios.indexOf(audio), 1);
            }
        }
        let roomInstance = this.findRoom(roomId, this.roomsManager.createdInstances);
        if(!roomInstance){
            return true;
        }
        let data = {
            act: AudioConst.AUDIO_DELETE,
            roomId: roomId,
            audios: [newAudioModel]
        };
        roomInstance.broadcast(data);
    }

    hotUnplugGlobalAudio(newAudioModel, id)
    {
        for(let audio of this.globalAudios){
            if(audio.id === id){
                this.globalAudios.splice(this.globalAudios.indexOf(audio), 1);
            }
        }
        let createdRooms = Object.keys(this.roomsManager.createdInstances);
        if(0 === createdRooms.length){
            return false;
        }
        for(let i of createdRooms){
            let roomInstance = this.roomsManager.createdInstances[i];
            let broadcastData = {
                act: AudioConst.AUDIO_DELETE,
                roomId: i,
                audios: [newAudioModel]
            };
            roomInstance.broadcast(broadcastData);
        }
    }

    findRoom(roomId, instancesList = {})
    {
        let roomInstances = Object.keys(instancesList);
        if(0 === roomInstances.length) {
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
