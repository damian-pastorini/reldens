/**
 *
 * Reldens - Team
 *
 * Represents a team of players with shared modifiers and properties.
 * Manages team membership, modifier application/reversion, and client tracking.
 *
 */

const { ModifierConst } = require('@reldens/modifiers');
const { ErrorManager, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 */
class Team
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {number} */
        this.level = sc.get(props, 'level', 1);
        /** @type {Object} */
        this.modifiers = sc.get(props, 'modifiers', {});
        /** @type {Object} */
        this.sharedProperties = sc.get(props, 'sharedProperties', {});
        /** @type {PlayerState|boolean} */
        this.owner = sc.get(props, 'owner', false);
        if(false === this.owner){
            ErrorManager.error('Team owner undefined.', props);
        }
        /** @type {Object|boolean} */
        this.ownerClient = sc.get(props, 'ownerClient', false);
        if(false === this.ownerClient){
            ErrorManager.error('Team owner client undefined.', props);
        }
        let players = {};
        let clients = {};
        players[this.owner.player_id] = this.owner;
        clients[this.owner.player_id] = this.ownerClient;
        /** @type {Object} */
        this.players = sc.get(props, 'players', players);
        /** @type {Object} */
        this.clients = sc.get(props, 'clients', clients);
    }

    /**
     * @param {PlayerState} playerSchema
     * @param {Object} client
     * @returns {boolean}
     */
    join(playerSchema, client)
    {
        this.players[playerSchema.player_id] = playerSchema;
        this.clients[playerSchema.player_id] = client;
        return this.applyModifiers(playerSchema);
    }

    /**
     * @param {PlayerState} playerSchema
     * @returns {boolean}
     */
    leave(playerSchema)
    {
        this.revertModifiers(playerSchema);
        playerSchema.currentTeam = false;
        delete this.clients[playerSchema.player_id];
        delete this.players[playerSchema.player_id];
        return true;
    }

    /**
     * @param {PlayerState} playerSchema
     * @returns {boolean}
     */
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

    /**
     * @param {PlayerState} playerSchema
     * @returns {boolean}
     */
    revertModifiers(playerSchema)
    {
        let modifiersKeys = Object.keys(this.modifiers);
        if(0 === modifiersKeys.length){
            return true;
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