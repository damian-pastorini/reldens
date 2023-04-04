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
        let previousClanId = playerSchema?.privateData?.clan;
        if(previousClanId){
            teamsPlugin.clans[previousClanId]?.leave(playerSchema);
        }
        let clanOwnerPlayerSchema = room.playerByIdFromState(data.id);
        if(!clanOwnerPlayerSchema){
            Logger.error('Player clan owner not found.', clanOwnerPlayerSchema, data);
            return false;
        }
        let clanId = clanOwnerPlayerSchema?.privateData?.clan;
        if(!clanId){
            Logger.error('Clan not found in player owner.', clanOwnerPlayerSchema, data);
            return false;
        }
        let clanOwnerActivePlayer = room.activePlayers[data.id];
        if(!clanOwnerActivePlayer){
            Logger.error('Active player clan owner client not found.', clanOwnerActivePlayer, data);
            return false;
        }
        let clanProps = {
            owner: clanOwnerActivePlayer,
            ownerClient: clanOwnerActivePlayer.client,
            sharedProperties: room.config.get('client/ui/clans/sharedProperties')
        };
        let currentClan = teamsPlugin.clans[clanId];
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
        if(!playerSchema.privateData){
            playerSchema.privateData = {};
        }
        playerSchema.privateData.clan = currentClan.id;
        teamsPlugin.clans[currentClan.id] = currentClan;
        let eventBeforeJoinUpdate = {currentClan, teamsPlugin, continueBeforeJoinUpdate: true};
        await teamsPlugin.events.emit('reldens.beforeClanUpdatePlayers', eventBeforeJoinUpdate);
        if(!eventBeforeJoinUpdate.continueBeforeJoinUpdate){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(currentClan);
    }

}

module.exports.ClanJoin = ClanJoin;
