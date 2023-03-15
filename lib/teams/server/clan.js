/**
 *
 * Reldens - Clan
 *
 */

const { Team } = require('./team');
const { sc } = require('@reldens/utils');

class Clan extends Team
{
    constructor(props)
    {
        super(props);
        this.id = sc.get(props, 'id', '');
        this.name = sc.get(props, 'name', '');
        this.points = sc.get(props, 'points', '');
        this.members = sc.get(props, 'members', {});
    }

    static fromModel(props)
    {
        let {clanModel, owner, ownerClient, sharedProperties} = props;
        return new this({
            owner,
            ownerClient,
            sharedProperties,
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
            name: this.name,
            points: this.points,
            level: this.level,
            ownerId: this.owner.id,
            members: this.mapMembersToArray()
        };
    }

    mapMembersToArray()
    {
        if(0 === sc.length(this.members)){
            return [];
        }
        let members = {};
        for(let i of Object.keys(this.members)){
            let member = this.members[i];
            members[i] = {
                // @TODO - BETA - Make other members data optional, like level or class path.
                name: member.parent_player.name,
                id: i
            }
        }
        return members;
    }

}

module.exports.Clan = Clan;