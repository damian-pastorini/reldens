/**
 *
 * Reldens - ClanLeave
 *
 * Handles player leaving or being removed from a clan.
 * Manages clan disbanding when owner leaves, removes clan membership records, and broadcasts updates.
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 */
class ClanLeave
{

    /**
     * @param {Object} message
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
    static async fromMessage(message, playerSchema, teamsPlugin)
    {
        await teamsPlugin.events.emit('reldens.clanLeave', {message, playerSchema, teamsPlugin});
        let currentClan = this.fetchCurrentClan(
            playerSchema,
            teamsPlugin,
            'From message, clan ID not found in current player for "leave".'
        );
        if(!currentClan){
            return false;
        }
        let playerSchemaId = playerSchema.player_id.toString();
        let isPlayerFromClan = message.id === playerSchema.getPrivate('clan');
        let isClanOwner = currentClan.owner.player_id.toString() === playerSchemaId;
        if(TeamsConst.ACTIONS.CLAN_REMOVE === message.act && (!isPlayerFromClan || !isClanOwner)){
            Logger.error('Clan remove failed, player "'+playerSchema.playerName+'" not allowed.');
            return false;
        }
        return await this.execute(playerSchema, teamsPlugin, sc.get(message, 'remove', playerSchema.player_id));
    }

    /**
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @param {number|string} singleRemoveId
     * @returns {Promise<boolean>}
     */
    static async execute(playerSchema, teamsPlugin, singleRemoveId)
    {
        let currentClan = this.fetchCurrentClan(
            playerSchema,
            teamsPlugin,
            'Clan ID not found in current player for "leave".'
        );
        if(!currentClan){
            return false;
        }
        let clanId = currentClan.id;
        let playerSchemaId = playerSchema.player_id.toString();
        let clanOwnerPlayerId = currentClan.owner.player_id.toString();
        let disbandClan = playerSchemaId === clanOwnerPlayerId;
        let removeByKeys = disbandClan && singleRemoveId !== clanOwnerPlayerId
            ? [singleRemoveId]
            : (disbandClan ? Object.keys(currentClan.members) : [playerSchemaId]);
        for(let playerId of removeByKeys){
            if(!sc.hasOwn(currentClan.members, playerId)){
                Logger.warning('Clan leave, player "'+playerId+'" is not a member of clan "'+clanId+'".');
                continue;
            }
            let sendUpdate = {
                act: TeamsConst.ACTIONS.CLAN_REMOVED,
                id: clanOwnerPlayerId,
                listener: TeamsConst.CLAN_KEY
            };
            await teamsPlugin.events.emit('reldens.clanLeaveBeforeSendUpdate', {
                playerId,
                sendUpdate,
                currentClan,
                disbandClan,
                singleRemoveId,
                playerSchema,
                teamsPlugin
            });
            await this.removeOnlineMember(currentClan, playerId, sendUpdate);
            delete currentClan.members[playerId];
            let clanMembersRepository = teamsPlugin.dataServer.getEntity('clanMembers');
            await clanMembersRepository.delete({player_id: Number(playerId), clan_id: Number(clanId)});
        }
        if(0 === Object.keys(currentClan.members).length){
            let event = {singleRemoveId, playerSchema, teamsPlugin, continueDisband: true};
            await teamsPlugin.events.emit('reldens.beforeClanDisband', event);
            if(!event.continueDisband){
                return false;
            }
            delete teamsPlugin.clans[clanId];
            await teamsPlugin.dataServer.getEntity('clan').deleteById(clanId);
            return true;
        }
        let event = {singleRemoveId, playerSchema, teamsPlugin, continueLeave: true};
        await teamsPlugin.events.emit('reldens.clanLeaveAfterSendUpdate', event);
        if(!event.continueLeave){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(currentClan);
    }

    /**
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @param {string} missingClanIdMessage
     * @returns {Object|boolean}
     */
    static fetchCurrentClan(playerSchema, teamsPlugin, missingClanIdMessage)
    {
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            Logger.warning(missingClanIdMessage, playerSchema?.player_id);
            return false;
        }
        let currentClan = teamsPlugin.clans[clanId];
        if(!currentClan){
            Logger.error('Player "'+playerSchema.player_id+'" current clan "'+clanId+'" not found.');
            return false;
        }
        return currentClan;
    }

    /**
     * @param {Object} currentClan
     * @param {number|string} playerId
     * @param {Object} sendUpdate
     * @returns {Promise<boolean>}
     */
    static async removeOnlineMember(currentClan, playerId, sendUpdate)
    {
        if(!sc.hasOwn(currentClan.players, playerId)){
            return false;
        }
        let memberPlayerSchema = currentClan.players[playerId];
        currentClan.clients[playerId].send('*', sendUpdate);
        currentClan.leave(memberPlayerSchema);
        await memberPlayerSchema.persistData({act: TeamsConst.ACTIONS.CLAN_REMOVED});
        return true;
    }

}

module.exports.ClanLeave = ClanLeave;
