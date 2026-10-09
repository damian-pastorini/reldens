/**
 *
 * Reldens - OfflineMemberModifiersReverter
 *
 * Reverts the clan level modifiers from the stored stats of a member that is removed while offline. The modifiers are
 * applied once when the player becomes a member and they are saved with the player stats (like the equipped items
 * modifiers), so a member removed while offline would keep them without this revert.
 *
 */

const { ModifierConst } = require('@reldens/modifiers');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 * @typedef {import('@reldens/modifiers').Modifier} Modifier
 */
class OfflineMemberModifiersReverter
{

    /**
     * @param {BaseDataServer} dataServer
     */
    constructor(dataServer)
    {
        /** @type {BaseDriver} */
        this.playersStatsRepository = dataServer.getEntity('playersStats');
        /** @type {BaseDriver} */
        this.statsRepository = dataServer.getEntity('stats');
    }

    /**
     * @param {number|string} playerId
     * @param {Object<number, Modifier>} modifiers
     * @returns {Promise<boolean>}
     */
    async revert(playerId, modifiers)
    {
        if(0 === Object.keys(modifiers).length){
            return true;
        }
        let statsKeysById = await this.fetchStatsKeysById();
        let playerStatsModels = await this.playersStatsRepository.loadBy('player_id', Number(playerId));
        let playerStats = {stats: {}, statsBase: {}};
        for(let playerStatModel of playerStatsModels){
            playerStats.stats[statsKeysById[playerStatModel.stat_id]] = playerStatModel.value;
            playerStats.statsBase[statsKeysById[playerStatModel.stat_id]] = playerStatModel.base_value;
        }
        for(let modifierId of Object.keys(modifiers)){
            modifiers[modifierId].revert(playerStats);
            if(ModifierConst.MOD_REVERTED !== modifiers[modifierId].state){
                Logger.error('Offline member modifier could not be reverted.', {playerId, modifierId});
                return false;
            }
        }
        for(let playerStatModel of playerStatsModels){
            let statKey = statsKeysById[playerStatModel.stat_id];
            await this.playersStatsRepository.updateById(
                playerStatModel.id,
                {value: playerStats.stats[statKey], base_value: playerStats.statsBase[statKey]}
            );
        }
        return true;
    }

    /**
     * @returns {Promise<Object<number, string>>}
     */
    async fetchStatsKeysById()
    {
        let statsKeysById = {};
        for(let statModel of await this.statsRepository.loadAll()){
            statsKeysById[statModel.id] = statModel.key;
        }
        return statsKeysById;
    }

}

module.exports.OfflineMemberModifiersReverter = OfflineMemberModifiersReverter;
