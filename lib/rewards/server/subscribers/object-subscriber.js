/**
 *
 * Reldens - Object Subscriber
 *
 */


class ObjectSubscriber
{

    static async enrichWithRewards(objectInstance)
    {
        objectInstance['rewards'] = await objectInstance.dataServer.getEntity('rewards').loadByWithRelations('object_id', objectInstance.id, ['objects_items_rewards_animations']);
    }
}

module.exports.ObjectSubscriber = ObjectSubscriber;
