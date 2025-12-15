/**
 *
 * Reldens - Clan
 *
 * Represents a clan of players with shared modifiers, properties, and persistent membership.
 * Manages clan membership, levels, points, modifiers, and provides client data mapping.
 *
 */

const { ModifierConst } = require('@reldens/modifiers');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 */
class Clan
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
        /** @type {Object|boolean} */
        this.owner = sc.get(props, 'owner', false);
        /** @type {Object|boolean} */
        this.ownerClient = sc.get(props, 'ownerClient', false);
        /** @type {Object} */
        this.players = sc.get(props, 'players', {});
        /** @type {Object} */
        this.clients = sc.get(props, 'clients', {});
        /** @type {string|number} */
        this.id = sc.get(props, 'id', '');
        /** @type {string} */
        this.name = sc.get(props, 'name', '');
        /** @type {string|number} */
        this.points = sc.get(props, 'points', '');
        /** @type {Object} */
        this.members = sc.get(props, 'members', {});
        /** @type {Object} */
        this.pendingInvites = sc.get(props, 'pendingInvites', {});
    }

    /**
     * @param {Object} props
     * @returns {Clan}
     */
    static fromModel(props)
    {
        let {clanModel, sharedProperties, clientOwner} = props;
        return new this({
            sharedProperties,
            owner: {
                player_id: clanModel.related_players.id,
                playerName: clanModel.related_players.name
            },
            ownerClient: clientOwner,
            members: this.mapMembersFromModelArray(clanModel.related_clan_members),
            id: clanModel.id,
            ownerId: clanModel.owner_id,
            name: clanModel.name,
            points: clanModel.points,
            level: clanModel.related_clan_levels
        });
    }

    /**
     * @param {Array} membersCollection
     * @returns {Object}
     */
    static mapMembersFromModelArray(membersCollection)
    {
        if(!sc.isArray(membersCollection) || 0 === membersCollection.length){
            return {};
        }
        let mappedMembers = {};
        for(let memberModel of membersCollection){
            mappedMembers[memberModel.player_id] = memberModel;
        }
        return mappedMembers;
    }

    /**
     * @returns {Object}
     */
    mapForClient()
    {
        return {
            id: this.id,
            clanName: this.name,
            points: this.points,
            level: this.level,
            ownerId: this.owner.player_id,
            leaderName: this.owner.playerName,
            members: this.mapMembersForClient()
        };
    }

    /**
     * @returns {Object|Array}
     */
    mapMembersForClient()
    {
        if(0 === sc.length(this.members)){
            return [];
        }
        let members = {};
        for(let i of Object.keys(this.members)){
            let member = this.members[i];
            let parentPlayer = member?.related_players;
            if(!parentPlayer){
                Logger.error('Member player not available.', member);
                continue;
            }
            members[i] = {
                // @TODO - BETA - Make other members data optional, like level or class path.
                name: parentPlayer.name,
                id: i
            }
        }
        return members;
    }

    /**
     * @param {PlayerState} playerSchema
     * @param {Object} client
     * @param {Object} clanMemberModel
     * @returns {boolean}
     */
    join(playerSchema, client, clanMemberModel)
    {
        let result = this.applyModifiers(playerSchema);
        if(!result){
            Logger.error('Player modifiers could not be applied.', playerSchema.player_id, result, this.players);
        }
        this.players[playerSchema.player_id] = playerSchema;
        this.clients[playerSchema.player_id] = client;
        this.members[playerSchema.player_id] = clanMemberModel;
        return result;
    }

    /**
     * @param {PlayerState} playerSchema
     * @returns {boolean}
     */
    leave(playerSchema)
    {
        delete this.members[playerSchema.player_id];
        return this.disconnect(playerSchema);
    }

    /**
     * @param {PlayerState} playerSchema
     * @returns {boolean}
     */
    disconnect(playerSchema)
    {
        let result = this.revertModifiers(playerSchema);
        if(!result){
            Logger.error('Player modifiers could not be reverted.', playerSchema.player_id, result, this.players);
        }
        playerSchema.privateData.clan = false;
        delete this.clients[playerSchema.player_id];
        delete this.players[playerSchema.player_id];
        return true;
    }

    /**
     * @param {string} sessionId
     * @returns {PlayerState|boolean}
     */
    playerBySessionId(sessionId)
    {
        let playersKeys = Object.keys(this.players);
        if(0 === playersKeys.length){
            return false;
        }
        for(let i of playersKeys){
            if(this.players[i].sessionId === sessionId){
                return this.players[i];
            }
        }
        return false;
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

module.exports.Clan = Clan;
