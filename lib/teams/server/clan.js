/**
 *
 * Reldens - Clan
 *
 */

const { ModifierConst } = require('@reldens/modifiers');
const { Logger, sc } = require('@reldens/utils');

class Clan
{
    constructor(props)
    {
        this.level = sc.get(props, 'level', 1);
        this.modifiers = sc.get(props, 'modifiers', {});
        this.sharedProperties = sc.get(props, 'sharedProperties', {});
        this.owner = sc.get(props, 'owner', false);
        this.ownerClient = sc.get(props, 'ownerClient', false);
        this.players = sc.get(props, 'players', {});
        this.clients = sc.get(props, 'clients', {});
        this.id = sc.get(props, 'id', '');
        this.name = sc.get(props, 'name', '');
        this.points = sc.get(props, 'points', '');
        this.members = sc.get(props, 'members', {});
        this.pendingInvites = sc.get(props, 'pendingInvites', {});
    }

    static fromModel(props)
    {
        let {clanModel, sharedProperties} = props;
        return new this({
            sharedProperties,
            owner: {
                player_id: clanModel.player_owner.id,
                playerName: clanModel.player_owner.name
            },
            members: this.mapMembersFromModelArray(clanModel.members),
            id: clanModel.id,
            ownerId: clanModel.owner_id,
            name: clanModel.name,
            points: clanModel.points,
            level: clanModel.level
        });
    }

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

    toArray()
    {
        return {
            id: this.id,
            clanName: this.name,
            points: this.points,
            level: this.level,
            ownerId: this.owner.player_id,
            leaderName: this.owner.playerName,
            members: this.membersToArray()
        };
    }

    membersToArray()
    {
        if(0 === sc.length(this.members)){
            return [];
        }
        let members = {};
        for(let i of Object.keys(this.members)){
            let member = this.members[i];
            let parentPlayer = member?.parent_player;
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

    leave(playerSchema)
    {
        delete this.members[playerSchema.player_id];
        return this.disconnect(playerSchema);
    }

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