/**
 *
 * Reldens - Team
 *
 */

const { ErrorManager, sc } = require('@reldens/utils');
const {TeamsConst} = require("../constants");

class Team
{
    constructor(props)
    {
        this.level = sc.get(props, 'level', 1);
        this.modifiers = sc.get(props, 'modifiers', {});
        this.sharedProperties = sc.get(props, 'sharedProperties', {});
        this.owner = sc.get(props, 'owner', false);
        if(false === this.owner){
            ErrorManager.error('Team owner undefined.', props);
        }
        this.ownerClient = sc.get(props, 'ownerClient', false);
        if(false === this.owner){
            ErrorManager.error('Team owner client undefined.', props);
        }
        let players = {};
        let clients = {};
        players[this.owner.id] = this.owner;
        clients[this.owner.id] = this.ownerClient;
        this.players = sc.get(props, 'players', players);
        this.clients = sc.get(props, 'clients', clients);
    }

    join(playerSchema, client)
    {
        this.players[playerSchema.id] = playerSchema;
        this.clients[playerSchema.id] = client;
        this.applyModifiers(playerSchema);
    }

    leave(playerSchema)
    {
        this.revertModifiers(playerSchema);
        playerSchema.currentTeam = false;
        delete this.clients[playerSchema.id];
        delete this.players[playerSchema.id];
    }

    applyModifiers(playerSchema)
    {
        let modifiersKeys = Object.keys(this.modifiers);
        if(0 === modifiersKeys.length){
            return false;
        }
        for(let i of modifiersKeys){
            let modifier = this.modifiers[i];
            modifier.apply(playerSchema);
        }
    }

    revertModifiers(playerSchema)
    {
        let modifiersKeys = Object.keys(this.modifiers);
        if(0 === modifiersKeys.length){
            return false;
        }
        for(let i of modifiersKeys){
            let modifier = this.modifiers[i];
            modifier.revert(playerSchema);
        }
    }

}

module.exports.Team = Team;