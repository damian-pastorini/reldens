/**
 *
 * Reldens - ClanMessageActions
 *
 */

const { ClanCreate } = require('./message-actions/clan-create');
const { TryClanInvite } = require('./message-actions/try-clan-invite');
const { ClanJoin } = require('./message-actions/clan-join');
const { ClanLeave } = require('./message-actions/clan-leave');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ClanMessageActions
{

    constructor(props)
    {
        this.teamsPlugin = props.teamsPlugin;
    }

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
            let clientSendingInvite = clanInvite.clients[clanInvite.owner.player_id];
            if(!clientSendingInvite){
                Logger.error(
                    'Clan invitation declined, player owner client not found.',
                    clanInvite,
                    clientSendingInvite,
                    data
                );
                return false;
            }
            let playerRejectingName = playerSchema.playerName;
            await this.teamsPlugin.events.emit('reldens.clanJoinInviteRejected', { clientSendingInvite, playerRejectingName });
        }
        if(TeamsConst.ACTIONS.CLAN_LEAVE === data.act){
            return await ClanLeave.fromMessage(data, playerSchema, this.teamsPlugin);
        }
    }

}

module.exports.ClanMessageActions = ClanMessageActions;
