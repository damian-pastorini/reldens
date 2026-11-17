/**
 *
 * Reldens - ClanMessageActions
 *
 * Handles clan-related message actions from clients.
 * Routes clan creation, invitations, joins, leaves, and removals to appropriate handlers. Only a pending invite can be
 * declined and the decline consumes it; the rejected line goes to the player that sent the invite.
 *
 */

const { ClanCreate } = require('./message-actions/clan-create');
const { TryClanInvite } = require('./message-actions/try-clan-invite');
const { ClanJoin } = require('./message-actions/clan-join');
const { ClanLeave } = require('./message-actions/clan-leave');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./plugin').TeamsPlugin} TeamsPlugin
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 */
class ClanMessageActions
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {TeamsPlugin} */
        this.teamsPlugin = props.teamsPlugin;
    }

    /**
     * @param {Object} client
     * @param {Object} data
     * @param {RoomScene} room
     * @param {PlayerState} playerSchema
     * @returns {Promise<boolean>}
     */
    async executeMessageActions(client, data, room, playerSchema)
    {
        if(!sc.hasOwn(data, 'act')){
            return false;
        }
        if(0 !== data.act.indexOf(TeamsConst.CLAN_PREF)){
            return false;
        }
        if(TeamsConst.ACTIONS.CLAN_INVITE === data.act){
            return await TryClanInvite.execute(client, data, room, playerSchema, this.teamsPlugin);
        }
        if(TeamsConst.ACTIONS.CLAN_CREATE === data.act){
            return await ClanCreate.execute(client, data, room, playerSchema, this.teamsPlugin);
        }
        if(TeamsConst.ACTIONS.CLAN_ACCEPTED === data.act && '1' === data.value){
            return await ClanJoin.execute(client, data, room, playerSchema, this.teamsPlugin);
        }
        if(TeamsConst.ACTIONS.CLAN_ACCEPTED === data.act && '2' === data.value){
            let clanInvite = this.teamsPlugin.clans[data.id];
            if(!clanInvite){
                Logger.error('Invite Clan not found.', clanInvite, data);
                return false;
            }
            let senderPlayerId = clanInvite.declineInvite(playerSchema.player_id);
            if(!senderPlayerId){
                Logger.warning('Player declining a clan invite that was not sent.', playerSchema.player_id, data.id);
                return false;
            }
            let clientSendingInvite = clanInvite.clients[senderPlayerId];
            if(!clientSendingInvite){
                Logger.error(
                    'Clan invitation declined, inviting player client not found.',
                    senderPlayerId,
                    data
                );
                return false;
            }
            let playerRejectingName = playerSchema.playerName;
            await this.teamsPlugin.events.emit('reldens.clanJoinInviteRejected', {
                clientSendingInvite,
                playerSendingInvite: clanInvite.players[senderPlayerId],
                playerRejectingName,
                clanInvite
            });
            return true;
        }
        if(TeamsConst.ACTIONS.CLAN_LEAVE === data.act || TeamsConst.ACTIONS.CLAN_REMOVE === data.act){
            return await ClanLeave.fromMessage(data, playerSchema, this.teamsPlugin);
        }
        return false;
    }

}

module.exports.ClanMessageActions = ClanMessageActions;
