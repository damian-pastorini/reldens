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
        if(TeamsConst.ACTIONS.CLAN_REMOVE === message.act && message.id !== playerSchema.sessionId){
            Logger.error('Clan remove failed, player "'+playerSchema.playerName+'" not allowed.');
            return false;
        }
        return await this.execute(playerSchema, teamsPlugin, sc.get(message, 'remove', playerSchema.id));
    }

    static async execute(playerSchema, teamsPlugin, singleRemoveId)
    {
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            Logger.warning('Clan ID not found in current player.', playerSchema);
            return false;
        }
        let currentClan = teamsPlugin.clans[clanId];
        if(!currentClan){
            Logger.error('Player "'+playerSchema.player_id+'" current clan "'+clanId+'" not found.');
            return false;
        }
        let disbandClan = playerSchema.id === currentClan.owner.id;
        let removeByKeys = disbandClan ? Object.keys(currentClan.players) : [singleRemoveId];
        for(let playerId of removeByKeys){
            let sendUpdate = {
                act: TeamsConst.ACTIONS.CLAN_INITIALIZE,
                id: currentClan.ownerClient.id,
                listener: TeamsConst.CLAN_KEY
            };
            await teamsPlugin.events.emit('reldens.clanLeaveBeforeSendUpdate', {
                playerId,
                sendUpdate,
                singleRemoveId,
                playerSchema,
                teamsPlugin
            });
            currentClan.clients[playerId].send('*', sendUpdate);
            currentClan.leave(currentClan.players[playerId]);
            delete currentClan.members[playerId];
            delete currentClan.players[playerId];
            delete currentClan.clients[playerId];
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
