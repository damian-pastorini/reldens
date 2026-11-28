/**
 *
 * Reldens - ClanCrossServerStateSync
 *
 * Keeps a clan in one state between the servers that have it loaded: the online members of every server are sent to
 * every other server (the "update" of GroupCrossServerStateSync), and a members change ("members") makes every server
 * load the stored members of the clan again (the change was stored by another server, so the members kept here are
 * stale) and remove its online players that are no longer members; a disband is sent as such, so the clan is dropped
 * without any load.
 *
 */

const { GroupCrossServerStateSync } = require('./group-cross-server-state-sync');
const { Clan } = require('./clan');
const { ClanUpdatesHandler } = require('./clan-updates-handler');
const { ClanLeave } = require('./message-actions/clan-leave');
const { TeamsConst } = require('../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./group-cross-server-state-sync').GroupCrossServerStateSyncProps} GroupCrossServerStateSyncProps
 */
class ClanCrossServerStateSync extends GroupCrossServerStateSync
{

    /**
     * @param {GroupCrossServerStateSyncProps} props
     */
    constructor(props)
    {
        super(Object.assign({}, props, {
            groups: props.teamsPlugin.clans,
            isUpdateToAllServers: true,
            sendGroupPlayers: (clan) => ClanUpdatesHandler.updateClanPlayers(clan),
            updateIntervalMs: TeamsConst.SYNC.UPDATE_INTERVAL_MS
        }));
    }

    /**
     * @param {string} action
     * @param {string} clanId
     * @param {Object} payload
     * @returns {Promise<{isSuccess: boolean}>}
     */
    async receiveAction(action, clanId, payload)
    {
        if(TeamsConst.SYNC.UPDATE === action){
            return this.receiveUpdate(clanId, payload);
        }
        if(TeamsConst.SYNC.MEMBERS === action){
            return {isSuccess: await this.receiveMembersChange(clanId, sc.get(payload, 'isDisbanded', false))};
        }
        return {isSuccess: false};
    }

    /**
     * @param {string} clanId
     * @param {boolean} isDisbanded
     * @returns {Promise<boolean>}
     */
    async receiveMembersChange(clanId, isDisbanded)
    {
        let clan = sc.get(this.teamsPlugin.clans, clanId, false);
        if(!clan){
            return true;
        }
        clan.members = isDisbanded ? {} : Clan.mapMembersFromModelArray(
            await this.teamsPlugin.dataServer.getEntity('clanMembers').loadByWithRelations(
                'clan_id',
                clan.id,
                ['related_players']
            )
        );
        for(let playerId of Object.keys(clan.players)){
            if(sc.hasOwn(clan.members, playerId)){
                continue;
            }
            let removedUpdate = {
                act: TeamsConst.ACTIONS.CLAN_REMOVED,
                id: String(clan.owner.player_id),
                listener: TeamsConst.CLAN_KEY
            };
            await this.teamsPlugin.events.emit('reldens.clanLeaveBeforeSendUpdate', {
                playerId,
                sendUpdate: removedUpdate,
                currentClan: clan,
                disbandClan: isDisbanded,
                singleRemoveId: playerId,
                playerSchema: clan.owner,
                teamsPlugin: this.teamsPlugin
            });
            await ClanLeave.removeOnlineMember(clan, playerId, removedUpdate);
        }
        for(let playerId of Object.keys(clan.remotePlayers)){
            if(!sc.hasOwn(clan.members, playerId)){
                delete clan.remotePlayers[playerId];
            }
        }
        if(isDisbanded){
            delete this.teamsPlugin.clans[clanId];
            return true;
        }
        return this.sendGroupPlayers(clan);
    }

}

module.exports.ClanCrossServerStateSync = ClanCrossServerStateSync;
