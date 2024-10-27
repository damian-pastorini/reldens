/**
 *
 * Reldens - ClanLeave
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class ClanLeave
{

    static async fromMessage(message, playerSchema, teamsPlugin)
    {
        await teamsPlugin.events.emit('reldens.clanLeave', {message, playerSchema, teamsPlugin});
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            Logger.warning('From message, clan ID not found in current player for "leave".', playerSchema?.player_id);
            return false;
        }
        let currentClan = teamsPlugin.clans[clanId];
        let playerSchemaId = playerSchema.player_id.toString();
        if(!currentClan){
            Logger.error('Player "'+playerSchemaId+'" current clan "'+clanId+'" not found.');
            return false;
        }
        let isPlayerFromClan = message.id === playerSchema.getPrivate('clan');
        let isClanOwner = currentClan.owner.player_id.toString() === playerSchemaId;
        if(TeamsConst.ACTIONS.CLAN_REMOVE === message.act && (!isPlayerFromClan || !isClanOwner)){
            Logger.error('Clan remove failed, player "'+playerSchema.playerName+'" not allowed.');
            return false;
        }
        let singleRemoveId = sc.get(message, 'remove', playerSchema.player_id);
        return await this.execute(playerSchema, teamsPlugin, singleRemoveId);
    }

    static async execute(playerSchema, teamsPlugin, singleRemoveId)
    {
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            Logger.warning('Clan ID not found in current player for "leave".', playerSchema?.player_id);
            return false;
        }
        let currentClan = teamsPlugin.clans[clanId];
        let playerSchemaId = playerSchema.player_id.toString();
        if(!currentClan){
            Logger.error('Player "'+playerSchemaId+'" current clan "'+clanId+'" not found.');
            return false;
        }
        let clanOwnerPlayerId = currentClan.owner.player_id.toString();
        let disbandClan = playerSchemaId === clanOwnerPlayerId;
        let removeByKeys = disbandClan && singleRemoveId !== clanOwnerPlayerId
            ? [singleRemoveId]
            : (disbandClan ? Object.keys(currentClan.players) : [playerSchemaId]);
        for(let playerId of removeByKeys){
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
            currentClan.clients[playerId].send('*', sendUpdate);
            currentClan.leave(currentClan.players[playerId]);
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

}

module.exports.ClanLeave = ClanLeave;
