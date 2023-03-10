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
    }

    static fromModel(clanModel, owner, sharedProperties)
    {
        return new this({
            owner,
            sharedProperties,
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
            level: this.level
        };
    }

}

module.exports.Clan = Clan;