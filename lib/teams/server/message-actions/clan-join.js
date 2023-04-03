/**
 *
 * Reldens - ClanJoin
 *
 */

const { Clan } = require('../clan');
const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { Logger } = require('@reldens/utils');

class ClanJoin
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        if(playerSchema.sessionId === data.id){
            Logger.info('The player is trying to join a clan with himself.', playerSchema.sessionId, data);
            return false;
        }
        if(playerSchema?.privateData?.clan){
            teamsPlugin.clans[playerSchema.player_id]?.leave(playerSchema);
        }
        let clanOwnerPlayer = room.playerByIdFromState(data.id);
        if(!clanOwnerPlayer){
            Logger.error('Player clan owner not found.', clanOwnerPlayer, data);
            return false;
        }
        let clanOwnerClient = room.activePlayers[data.id];
        if(!clanOwnerClient){
            Logger.error('Player clan owner client not found.', clanOwnerClient, data);
            return false;
        }
        let clanProps = {
            owner: clanOwnerPlayer,
            ownerClient: clanOwnerClient.client,
            sharedProperties: room.config.get('client/ui/clans/sharedProperties')
        };
        let currentClan = teamsPlugin.clans[clanOwnerClient.id];
        if(!currentClan){
            let beforeCreateEvent = {clanProps, teamsPlugin, continueBeforeCreate: true};
            await teamsPlugin.events.emit('reldens.beforeClanCreate', beforeCreateEvent);
            if(!beforeCreateEvent.continueBeforeCreate){
                return false;
            }
            currentClan = new Clan(clanProps);
        }
        let eventBeforeJoin = {currentClan, teamsPlugin, continueBeforeJoin: true};
        await teamsPlugin.events.emit('reldens.beforeClanJoin', eventBeforeJoin);
        if(!eventBeforeJoin.continueBeforeJoin){
            return false;
        }
        currentClan.join(playerSchema, client);
        if(!clanOwnerPlayer.privateData){
            clanOwnerPlayer.privateData = {};
        }
        clanOwnerPlayer.privateData.clan = clanOwnerClient.id;
        if(!playerSchema.privateData){
            playerSchema.privateData = {};
        }
        playerSchema.privateData.clan = clanOwnerClient.id;
        teamsPlugin.clans[clanOwnerClient.id] = currentClan;
        let eventBeforeJoinUpdate = {currentClan, teamsPlugin, continueBeforeJoinUpdate: true};
        await teamsPlugin.events.emit('reldens.beforeClanUpdatePlayers', eventBeforeJoinUpdate);
        if(!eventBeforeJoinUpdate.continueBeforeJoinUpdate){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(currentClan);
    }

}

module.exports.ClanJoin = ClanJoin;
