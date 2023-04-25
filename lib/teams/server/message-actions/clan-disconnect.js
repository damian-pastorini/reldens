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
        if(playerSchema?.physicalBody?.isChangingScene){
            Logger.info('Player is changing scene, avoid disconnect update.');
            return false;
        }
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            Logger.info(
                'Clan ID not found in current player for disconnection.',
                playerSchema.player_id,
                playerSchema.privateData
            );
            return false;
        }
        let clan = teamsPlugin.clans[clanId];
        if(!clan){
            Logger.error('Player "'+playerSchema.player_id+'" current clan "'+clanId+'" not found for disconnection.');
            return false;
        }
        // @NOTE: the way this works is by making the clients leave the clan and then updating the remaining players.
        let playerId = playerSchema.player_id;
        let client = clan.clients[playerId];
        if(1 === client?.ref?.readyState){
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
            client.send('*', sendUpdate);
        }
        clan.disconnect(clan.players[playerId]);
        let afterDisconnectKeys = Object.keys(clan.players);
        if(0 === afterDisconnectKeys.length){
            Logger.info('Last player on clan disconnected.');
            delete teamsPlugin.clans[clanId];
            return true;
        }
        let event = {playerSchema, teamsPlugin, continueLeave: true};
        await teamsPlugin.events.emit('reldens.clanDisconnectAfterSendUpdate', event);
        if(!event.continueLeave){
            Logger.info('Stopped event "clanDisconnectAfterSendUpdate".');
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

}

module.exports.ClanDisconnect = ClanDisconnect;
