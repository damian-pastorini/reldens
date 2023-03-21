/**
 *
 * Reldens - ClanMessageActions
 *
 */

const { ClanCreate } = require('./message-actions/clan-create');
const { TeamsConst } = require('../constants');
const { sc } = require('@reldens/utils');

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
            // await TryTeamStart.execute(client, data, room, playerSchema, this.teamsPlugin);
            return true;
        }
        if(TeamsConst.ACTIONS.CLAN_CREATE === data.act){
            await ClanCreate.execute(client, data, room, playerSchema, this.teamsPlugin);
            return true;
        }
        if(TeamsConst.ACTIONS.CLAN_ACCEPTED === data.act && '1' === data.value){
            // await TeamJoin.execute(client, data, room, playerSchema, this.teamsPlugin);
            return true;
        }
        if(TeamsConst.ACTIONS.CLAN_LEAVE === data.act){
            // await TeamLeave.execute(client, data, room, playerSchema, this.teamsPlugin);
            return true;
        }
    }

}

module.exports.ClanMessageActions = ClanMessageActions;
