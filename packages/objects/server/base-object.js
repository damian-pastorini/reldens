/**
 *
 * Reldens - BaseObject
 *
 * Every object created will have a position.
 * Objects are just an internal platform definition, different from game items which are in a different module.
 *
 */

const { InteractionArea, Logger, sc } = require('@reldens/utils');

class BaseObject extends InteractionArea
{

    constructor(props)
    {
        super();
        // then we will assign all the properties from the storage automatically as part of this object.
        Object.assign(this, props);
        this.appendIndex = sc.getDef(props, 'tile_index', props.id);
        this.objectIndex = props.layer_name + this.appendIndex;
        // we will use the client_key has the object key:
        this.key = props.client_key;
        this.uid = this.key + Date.now();
        this.eventsPrefix = 'bo';
        // in this specific object type we will use the public params as JSON, this is coming from the storage:
        try {
            this.clientParams = sc.getJson(props.client_params, {});
        } catch (err) {
            Logger.error(['BaseObject, clientParams JSON error:', props.client_params]);
        }
        this.clientParams.key = this.key;
        this.clientParams.id = this.id;
        this.clientParams.targetName = this.title;
        // @NOTE: we need to send the layer name for later calculate the animation depth and show the animation over the
        // proper layer.
        this.clientParams.layerName = props.layer_name;
    }

    // @NOTE: passing the eventsManager here is a temporal fix since npm link doesn't work well with objects instances.
    // eslint-disable-next-line no-unused-vars
    runAdditionalSetup(eventsManager)
    {
        // @NOTE: implement what you need here.
    }

}

module.exports.BaseObject = BaseObject;
