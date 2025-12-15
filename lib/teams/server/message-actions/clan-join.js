/**
 *
 * Reldens - ClanJoin
 *
 * Handles player joining a clan after accepting an invitation.
 * Creates clan membership record, manages previous clan membership, and broadcasts updates to clan members.
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { ClanLeave } = require('./clan-leave');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 */
class ClanJoin
{

    /**
     * @param {Object} client
     * @param {Object} data
     * @param {RoomScene} room
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        let clanToJoin = teamsPlugin.clans[data.id];
        if(!clanToJoin?.pendingInvites[playerSchema.player_id]){
            Logger.error('Player trying to join a clan without invite.');
            return false;
        }
        let previousClanId = playerSchema.getPrivate('clan');
        if(previousClanId){
            await ClanLeave.execute(playerSchema, teamsPlugin);
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
            ['related_players']
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
