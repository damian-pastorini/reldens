/**
 *
 * Reldens - ClanDisconnect
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

class ClanDisconnect
{

    static async execute(playerSchema, teamsPlugin)
    {
        // @TODO - BETA - Consider extend TeamLeave.
        if(!playerSchema){
            Logger.info('Player already left, wont disconnect from clan.');
            return false;
        }
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            Logger.warning('Clan ID not found in current player for disconnection.', playerSchema.player_id);
            return false;
        }
        let clan = teamsPlugin.clans[clanId];
        if(!clan){
            Logger.error('Player "'+playerSchema.player_id+'" current clan "'+clanId+'" not found for disconnection.');
            return false;
        }
        // @NOTE: the way this works is by making the clients leave the clan and then updating the remaining players.
        let playerIds = Object.keys(clan.players);
        let removeByKeys = playerSchema.id === clanId || 2 >= playerIds.length ? playerIds : [playerSchema.player_id];
        for(let playerId of removeByKeys){
            let sendUpdate = {
                act: TeamsConst.ACTIONS.CLAN_LEFT,
                id: clan.ownerClient.id,
                listener: TeamsConst.KEY
            };
            await teamsPlugin.events.emit('reldens.clanDisconnectBeforeSendUpdate', {
                playerId,
                sendUpdate,
                playerSchema,
                teamsPlugin
            });
            clan.clients[playerId].send('*', sendUpdate);
            clan.disconnect(clan.players[playerId]);
        }
        let event = {playerSchema, teamsPlugin, continueLeave: true};
        await teamsPlugin.events.emit('reldens.clanDisconnectAfterSendUpdate', event);
        if(!event.continueLeave){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

}

module.exports.ClanDisconnect = ClanDisconnect;
