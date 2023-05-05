/**
 *
 * Reldens - ClanJoin
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { Logger } = require('@reldens/utils');

class ClanJoin
{

    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        let clanToJoin = teamsPlugin.clans[data.id];
        if(!clanToJoin?.pendingInvites[playerSchema.player_id]){
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
            player_id: playerSchema.player_id,
            clan_id: clanToJoin.id
        });
        if(!result){
            Logger.critical('Clan member could not be created.', playerSchema?.id, clanToJoin?.id);
            return false;
        }
        let newMemberModel = await teamsPlugin.dataServer.getEntity('clanMembers').loadOneByWithRelations(
            {player_id: playerSchema.player_id, clan_id: clanToJoin.id},
            ['parent_player']
        );
        clanToJoin.join(
            playerSchema,
            client,
            // @TODO - BETA - Replace this query with a constructed member, use the exiting player model and the result.
            newMemberModel
        );
        playerSchema.setPrivate('clan', clanToJoin.id);
        let eventBeforeJoinUpdate = {clanToJoin, teamsPlugin, continueBeforeJoinUpdate: true};
        await teamsPlugin.events.emit('reldens.beforeClanUpdatePlayers', eventBeforeJoinUpdate);
        if(!eventBeforeJoinUpdate.continueBeforeJoinUpdate){
            return false;
        }
        let updatedClan = ClanUpdatesHandler.updateClanPlayers(clanToJoin);
        if(updatedClan){
            await teamsPlugin.events.emit('reldens.afterPlayerJoinedClan', { playerJoining: playerSchema, clan: clanToJoin });
        }
        return updatedClan;
    }

}

module.exports.ClanJoin = ClanJoin;
