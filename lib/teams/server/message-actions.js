/**
 *
 * Reldens - TeamsMessageActions
 *
 */

const { TryTeamStart } = require('./message-actions/try-team-start');
const { TeamJoin } = require('./message-actions/team-join');
const { TeamsConst } = require('../constants');
const { sc } = require('@reldens/utils');

class TeamsMessageActions
{

    constructor(props)
    {
        this.plugin = props.plugin;
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(!sc.hasOwn(data, 'act')){
            return false;
        }
        if(0 !== data.act.indexOf(TeamsConst.TEAM_PREF)){
            return false;
        }
        if(TeamsConst.ACTIONS.TEAM_INVITE === data.act){
            TryTeamStart.execute(client, data, room, playerSchema);
            return true;
        }
        if(TeamsConst.ACTIONS.TEAM_ACCEPTED === data.act && '1' === data.value){
            TeamJoin.execute(client, data, room, playerSchema, this.plugin);
            return true;
        }
        if(TeamsConst.ACTIONS.TEAM_LEAVE === data.act){
            this.plugin.teams[data.id].leave(playerSchema);
            delete this.plugin.playersTeamsRelation[playerSchema.id];
            return true;
        }
    }

}

module.exports.TeamsMessageActions = TeamsMessageActions;
