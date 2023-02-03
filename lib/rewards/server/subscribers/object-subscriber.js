/**
 *
 * Reldens - Object Subscriber
 *
 */


class ObjectSubscriber
{

    static async enrichWithRewards(objectInstance)
    {
        objectInstance['rewards'] = await objectInstance.dataServer.getEntity('rewards').loadBy('object_id', objectInstance.id);
    }
}

module.exports.ObjectSubscriber = ObjectSubscriber;
