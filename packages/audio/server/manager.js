/**
 *
 * Reldens - AudioManager
 *
 */

const { rawRegisteredEntities } = require('./registered-entities');
const { AudioConst } = require('../constants');
const { sc } = require('@reldens/utils');

class AudioManager
{

    constructor()
    {
        this.models = rawRegisteredEntities;
        this.categories = {};
        this.globalAudios = {};
        this.roomsAudios = {};
    }

    async loadAudioCategories()
    {
        this.categories = await this.models.audioCategories.query().where('enabled', 1);
    }

    async loadGlobalAudios()
    {
        if(!Object.keys(this.globalAudios).length){
            this.globalAudios = await this.models.audio.loadGlobalAudios();
        }
        return this.globalAudios;
    }

    async loadRoomAudios(roomId)
    {
        if(!sc.hasOwn(this.roomsAudios, roomId)){
            this.roomsAudios[roomId] = await this.models.audio.loadRoomAudios(roomId);
        }
        return this.roomsAudios[roomId];
    }

    async loadAudioPlayerConfig(playerId)
    {
        let configModels = await this.models.AudioPlayerConfigModel.query().where('player_id', playerId);
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
        let audioCategory = await this.models.audioCategories.loadBy('category_key', message.ck).first();
        if(!currentPlayer || currentPlayer.playerId || !audioCategory){
            return false;
        }
        let updatePatch = {
            player_id: currentPlayer.player_id,
            category_id: audioCategory.id,
            enabled: (message.up ? 1 : 0)
        };
        let playerConfig = await this.models.AudioPlayerConfigModel.query()
            .where('player_id', currentPlayer.player_id)
            .where('category_id', audioCategory.id)
            .first();
        if(playerConfig){
            await this.models.AudioPlayerConfigModel.saveConfigByPlayerAndCategory(
                currentPlayer.player_id,
                audioCategory.id,
                (message.up ? 1 : 0)
            );
        } else {
            await this.models.AudioPlayerConfigModel.insertConfig(updatePatch);
        }
    }

}

module.exports.AudioManager = AudioManager;
