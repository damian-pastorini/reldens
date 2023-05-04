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
        if(TeamsConst.ACTIONS.CLAN_REMOVE === message.act && message.id !== playerSchema.player_id){
            Logger.error('Clan remove failed, player "'+playerSchema.playerName+'" not allowed.');
            return false;
        }
        return await this.execute(playerSchema, teamsPlugin, sc.get(message, 'remove', playerSchema.player_id));
    }

    static async execute(playerSchema, teamsPlugin, singleRemoveId)
    {
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            Logger.warning('Clan ID not found in current player.', playerSchema);
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
        let removeByKeys = disbandClan ? Object.keys(currentClan.players) : [singleRemoveId];
        for(let playerId of removeByKeys){
            let sendUpdate = {
                act: TeamsConst.ACTIONS.CLAN_INITIALIZE,
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
            await teamsPlugin.dataServer.getEntity('clanMembers').deleteBy({'player_id': playerId});
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
