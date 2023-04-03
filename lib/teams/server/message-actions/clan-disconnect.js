/**
 *
 * Reldens - ClanDisconnect
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class ClanDisconnect
{

    static async execute(playerSchema, teamsPlugin)
    {
        let clanId = playerSchema?.privateData?.clan?.id;
        if(!clanId){
            Logger.warning('Clan ID not found in current player for disconnection.', playerSchema);
            return false;
        }
        let currentClan = teamsPlugin.clans[clanId];
        if(!currentClan){
            Logger.error('Player "'+playerSchema.player_id+'" current clan "'+clanId+'" not found for disconnection.');
            return false;
        }
        // @NOTE: the way this works is by making the clients leave the clan and then updating the remaining players.
        let playerIds = Object.keys(currentClan.players);
        let removeByKeys = playerSchema.id === clanId || 2 >= playerIds.length ? playerIds : [playerSchema.player_id];
        for(let playerId of removeByKeys){
            let sendUpdate = {
                act: TeamsConst.ACTIONS.CLAN_LEFT,
                id: currentClan.ownerClient.id,
                listener: TeamsConst.KEY
            };
            await teamsPlugin.events.emit('reldens.clanLeaveBeforeSendUpdate', {
                playerId,
                sendUpdate,
                playerSchema,
                teamsPlugin
            });
            currentClan.clients[playerId].send('*', sendUpdate);
            currentClan.leave(currentClan.players[playerId]);
        }
        if(0 === Object.keys(currentClan.members).length){
            let event = {playerSchema, teamsPlugin, continueDisband: true};
            await teamsPlugin.events.emit('reldens.beforeClanTeamDisband', event);
            if(!event.continueDisband){
                return false;
            }
            delete teamsPlugin.clans[clanId];
            return true;
        }
        let event = {playerSchema, teamsPlugin, continueLeave: true};
        await teamsPlugin.events.emit('reldens.clanLeaveAfterSendUpdate', event);
        if(!event.continueLeave){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(currentClan);
    }

}

module.exports.ClanDisconnect = ClanDisconnect;
