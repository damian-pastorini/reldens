/**
 *
 * Reldens - BaseObject
 *
 * Every object created will have a position.
 * Objects are just an internal platform definition, different from game items which are in a different module.
 *
 */

const { ObjectsConst } = require('../../../constants');
const { InteractionArea, Logger, sc } = require('@reldens/utils');

class BaseObject extends InteractionArea
{

    constructor(props)
    {
        super();
        // then we will assign all the properties from the storage automatically as part of this object.
        Object.assign(this, props);
        if(!this.events){
            Logger.error('EventsManager undefined in BaseObject.');
        }
        if(!this.config){
            Logger.error('Config undefined in BaseObject.');
        }
        this.appendIndex = sc.get(props, 'tile_index', props.id);
        this.objectIndex = props.layer_name + this.appendIndex;
        // we will use the client_key has the object key:
        this.key = props.client_key;
        this.uid = this.key + Date.now();
        this.eventsPrefix = 'bo';
        // defaults:
        this.setDefaultProperties();
        this.mapClientParams(props);
        this.mapPrivateParams(props);
    }

    setDefaultProperties()
    {
        this.runOnHit = false;
        this.objectBody = false;
        this.runOnAction = false;
        this.playerVisible = false;
        this.roomVisible = false;
        this.clientParams = {};
    }

    mapPrivateParams(props)
    {
        // @NOTE: private params will override the object properties:
        this.privateParamsRaw = props.private_params;
        Object.assign(this, sc.toJson(this.privateParamsRaw, {}));
    }

    mapClientParams(props)
    {
        // in this specific object type we will use the public params as JSON, this is coming from the storage:
        Object.assign(this.clientParams, sc.toJson(props.client_params, {}));
        this.content = sc.get(this.clientParams, 'content', ObjectsConst.DEFAULTS.BASE_OBJECT.CONTENT);
        this.options = sc.get(this.clientParams, 'options', ObjectsConst.DEFAULTS.BASE_OBJECT.OPTIONS);
        this.clientParams.key = this.key;
        this.clientParams.id = this.id;
        this.clientParams.targetName = this.title;
        // @NOTE: we need to send the layer name for later calculate the animation depth and show the animation over
        // the proper layer.
        this.clientParams.layerName = props.layer_name;
    }

    // eslint-disable-next-line no-unused-vars
    async runAdditionalSetup(props)
    {
        // @NOTE: implement what you need here.
        Logger.alert('Method not implemented "runAdditionalSetup" on: '+this.key);
    }

}

module.exports.BaseObject = BaseObject;
