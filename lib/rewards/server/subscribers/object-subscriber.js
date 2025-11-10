/**
 *
 * Reldens - ObjectSubscriber
 *
 */

const { RewardsMapper } = require('../rewards-mapper');

class ObjectSubscriber
{

    static async enrichWithRewards(objectInstance)
    {
        if(!objectInstance){
            return;
        }
        objectInstance['rewards'] = RewardsMapper.fromModels(
            await objectInstance.dataServer.getEntity('rewards').loadByWithRelations(
                'object_id',
                objectInstance.id,
                ['related_items_item.related_drops_animations', 'related_rewards_modifiers']
            )
        );
    }

}

module.exports.ObjectSubscriber = ObjectSubscriber;
