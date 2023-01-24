/**
 *
 * Reldens - Team
 *
 */

const { ErrorManager, sc } = require('@reldens/utils');

class Team
{
    constructor(props)
    {
        this.level = sc.get(props, 'level', 1);
        this.players = sc.get(props, 'players', {});
        this.modifiers = sc.get(props, 'modifiers', {});
        this.sharedProperties = sc.get(props, 'sharedProperties', {});
        this.owner = sc.get(props, 'owner', false);
        if(false === this.owner){
            ErrorManager.error('Team owner undefined.', props);
        }
    }

    join(player)
    {
        this.players[player.player_id] = player;
        this.applyModifiers(player);
    }

    leave(player)
    {
        this.revertModifiers(player);
        delete this.players[player.player_id];
    }

    applyModifiers(player)
    {
        let modifiersKeys = Object.keys(this.modifiers);
        if(0 === modifiersKeys.length){
            return false;
        }
        for(let i of modifiersKeys){
            let modifier = this.modifiers[i];
            modifier.apply(player);
        }
    }

    revertModifiers(player)
    {
        let modifiersKeys = Object.keys(this.modifiers);
        if(0 === modifiersKeys.length){
            return false;
        }
        for(let i of modifiersKeys){
            let modifier = this.modifiers[i];
            modifier.revert(player);
        }
    }

}

module.exports.Team = Team;