/**
 *
 * Reldens - Clan
 *
 * Represents a clan of players with shared modifiers, properties, and persistent membership.
 * Manages clan membership, levels, points, modifiers, and provides client data mapping. A pending invite is used once,
 * by the join or the decline of the invited player; the join reserves it while the member is created and restores it
 * when the join fails, so a failed join can be retried and overlapping accepts never join twice.
 *
 */

const { SharedModifiersGroup } = require('./shared-modifiers-group');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 */
class Clan extends SharedModifiersGroup
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super(props);
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
        /** @type {Object} */
        this.reservedInvites = {};
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
            modifiers: sc.get(props, 'modifiers', {}),
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
     * @param {string|number} playerId
     * @returns {boolean}
     */
    consumeInvite(playerId)
    {
        if(!this.pendingInvites[playerId]){
            return false;
        }
        delete this.pendingInvites[playerId];
        return true;
    }

    /**
     * @param {string|number} playerId
     * @returns {boolean}
     */
    reserveInvite(playerId)
    {
        if(!this.consumeInvite(playerId)){
            return false;
        }
        this.reservedInvites[playerId] = true;
        return true;
    }

    /**
     * @param {string|number} playerId
     * @param {boolean} isUsed
     * @returns {boolean}
     */
    releaseInvite(playerId, isUsed)
    {
        if(!this.reservedInvites[playerId]){
            return false;
        }
        delete this.reservedInvites[playerId];
        if(!isUsed){
            this.pendingInvites[playerId] = true;
        }
        return true;
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
        return result;
    }

    /**
     * @param {number|string} playerId
     * @param {Object} objectState
     * @returns {boolean}
     */
    revertModifiersOnSavedStats(playerId, objectState)
    {
        if(!sc.hasOwn(this.players, playerId)){
            return false;
        }
        let savedStats = {stats: {...objectState.stats}, statsBase: {...objectState.statsBase}};
        let result = this.revertModifiers(savedStats);
        if(!result){
            Logger.error('Clan modifiers could not be reverted on the saved stats.', this.id, result);
        }
        objectState.stats = savedStats.stats;
        objectState.statsBase = savedStats.statsBase;
        return result;
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

}

module.exports.Clan = Clan;
