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
        let clanToJoin = teamsPlugin.clans[data.id];
        if(!clanToJoin?.pendingInvites[playerSchema.sessionId]){
            Logger.error('Player trying to join a clan without invite.');
            return false;
        }
        let previousClanId = playerSchema.getPrivate('clan');
        if(previousClanId){
            teamsPlugin.clans[previousClanId]?.leave(playerSchema);
        }
        let eventBeforeJoin = {clanToJoin, teamsPlugin, continueBeforeJoin: true};
        await teamsPlugin.events.emit('reldens.beforeClanJoin', eventBeforeJoin);
        if(!eventBeforeJoin.continueBeforeJoin){
            return false;
        }
        let result = await teamsPlugin.dataServer.getEntity('clanMembers').create({
            player_id: playerSchema.id,
            clan_id: clanToJoin.id
        });
        if(!result){
            Logger.critical('Clan member could not be created.', playerSchema?.id, clanToJoin?.id);
            return false;
        }
        clanToJoin.join(playerSchema, client);
        playerSchema.setPrivate('clan', clanToJoin.id);
        let eventBeforeJoinUpdate = {clanToJoin, teamsPlugin, continueBeforeJoinUpdate: true};
        await teamsPlugin.events.emit('reldens.beforeClanUpdatePlayers', eventBeforeJoinUpdate);
        if(!eventBeforeJoinUpdate.continueBeforeJoinUpdate){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(clanToJoin);
    }

}

module.exports.ClanJoin = ClanJoin;
