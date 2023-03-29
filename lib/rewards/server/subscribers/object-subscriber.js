/**
 *
 * Reldens - ObjectSubscriber
 *
 */
const { RewardsMapper } = require('../models/rewards-mapper');


class ObjectSubscriber
{
    static async enrichWithRewards(objectInstance)
    {
        objectInstance['rewards'] = RewardsMapper.fromModels(
            await objectInstance.dataServer.getEntity('rewards').loadByWithRelations(
                'object_id',
                objectInstance.id,
                ['animations', 'items_item', 'modifier']
            )
        );
    }

}

module.exports.ObjectSubscriber = ObjectSubscriber;
