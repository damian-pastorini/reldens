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
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 * @typedef {import('@reldens/modifiers').Modifier} Modifier
 * @typedef {import('../../users/server/plugin').UsersPlugin} UsersPlugin
 *
 * @typedef {Object} OfflineMemberModifiersReverterProps
 * @property {UsersPlugin|boolean} usersPlugin
 * @property {BaseDataServer} dataServer
 */
class OfflineMemberModifiersReverter
{

    /**
     * @param {OfflineMemberModifiersReverterProps} props
     */
    constructor(props)
    {
        /** @type {UsersPlugin|boolean} */
        this.usersPlugin = sc.get(props, 'usersPlugin', false);
        /** @type {BaseDriver} */
        this.playersStatsRepository = props.dataServer.getEntity('playersStats');
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
        if(!this.usersPlugin){
            Logger.error('Missing users plugin to revert the offline member modifiers.', {playerId});
            return false;
        }
        let playerStats = await this.usersPlugin.processStatsData('playersStats', Number(playerId));
        for(let modifierId of Object.keys(modifiers)){
            modifiers[modifierId].revert(playerStats);
            if(ModifierConst.MOD_REVERTED !== modifiers[modifierId].state){
                Logger.error('Offline member modifier could not be reverted.', {playerId, modifierId});
                return false;
            }
        }
        for(let statKey of Object.keys(playerStats.stats)){
            await this.playersStatsRepository.update(
                {player_id: Number(playerId), stat_id: this.usersPlugin.statsByKey[statKey].id},
                {value: playerStats.stats[statKey], base_value: playerStats.statsBase[statKey]}
            );
        }
        return true;
    }

}

module.exports.OfflineMemberModifiersReverter = OfflineMemberModifiersReverter;
