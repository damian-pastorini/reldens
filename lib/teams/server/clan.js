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
        this.name = sc.get(props, 'name', '');
        this.points = sc.get(props, 'points', '');
        this.members = sc.get(props, 'members', '');
    }

    static fromModel(clanModel, owner, ownerClient, members, sharedProperties)
    {
        return new this({
            owner,
            ownerClient,
            members,
            sharedProperties,
            id: clanModel.id,
            ownerId: clanModel.owner_id,
            name: clanModel.name,
            points: clanModel.points,
            level: clanModel.level
        });
    }

    forSendData()
    {
        return {
            name: this.name,
            points: this.points,
            level: this.level,
            ownerId: this.owner.id,
        };
    }

}

module.exports.Clan = Clan;