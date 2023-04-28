/**
 *
 * Reldens - Team
 *
 */

const { ModifierConst } = require('@reldens/modifiers');
const { ErrorManager, sc } = require('@reldens/utils');

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
        if(false === this.ownerClient){
            ErrorManager.error('Team owner client undefined.', props);
        }
        let players = {};
        let clients = {};
        players[this.owner.player_id] = this.owner;
        clients[this.owner.player_id] = this.ownerClient;
        this.players = sc.get(props, 'players', players);
        this.clients = sc.get(props, 'clients', clients);
    }

    join(playerSchema, client)
    {
        this.players[playerSchema.player_id] = playerSchema;
        this.clients[playerSchema.player_id] = client;
        return this.applyModifiers(playerSchema);
    }

    leave(playerSchema)
    {
        this.revertModifiers(playerSchema);
        playerSchema.currentTeam = false;
        delete this.clients[playerSchema.player_id];
        delete this.players[playerSchema.player_id];
        return true;
    }

    applyModifiers(playerSchema)
    {
        let modifiersKeys = Object.keys(this.modifiers);
        if(0 === modifiersKeys.length){
            return true;
        }
        for(let i of modifiersKeys){
            let modifier = this.modifiers[i];
            modifier.apply(playerSchema);
            if(ModifierConst.MOD_APPLIED !== modifier.state){
                return false;
            }
        }
        return true;
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
            if(ModifierConst.MOD_REVERTED !== modifier.state){
                return false;
            }
        }
        return true;
    }

}

module.exports.Team = Team;