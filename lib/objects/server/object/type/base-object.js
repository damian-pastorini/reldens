/**
 *
 * Reldens - BaseObject
 *
 */

const { ObjectsConst } = require('../../../constants');
const { InteractionArea, Logger, sc } = require('@reldens/utils');

class BaseObject extends InteractionArea
{

    constructor(props)
    {
        super();
        // assign all the properties from the storage automatically as part of this object:
        Object.assign(this, props);
        if(!this.events){
            Logger.error('EventsManager undefined in BaseObject.');
        }
        if(!this.config){
            Logger.error('Config undefined in BaseObject.');
        }
        if(!this.dataServer){
            Logger.error('Data Server undefined in BaseObject.');
        }
        this.appendIndex = sc.get(props, 'tile_index', props.id);
        this.objectIndex = props.layer_name + (this.appendIndex || '-idx-1');
        // we will use the client_key has the object key:
        this.key = props.client_key;
        this.uid = this.key +'-'+ Date.now();
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.BASE;
        this.setDefaultProperties();
        this.mapClientParams(props);
        this.mapPrivateParams(props);
    }

    eventUniqueKey(suffix)
    {
        return this.eventsPrefix+'.'+(new Date()).getTime()+(suffix ? '.'+suffix : '');
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
        let privateParamsObject = sc.toJson(this.privateParamsRaw, {});
        Object.assign(this, privateParamsObject);
    }

    mapClientParams(props)
    {
        // in this specific object type we will use the public params as JSON, this is coming from the storage:
        let clientParamsObject = sc.toJson(props.client_params, {});
        Object.assign(this.clientParams, clientParamsObject);
        this.content = sc.get(this.clientParams, 'content', ObjectsConst.DEFAULTS.BASE_OBJECT.CONTENT);
        this.options = sc.get(this.clientParams, 'options', ObjectsConst.DEFAULTS.BASE_OBJECT.OPTIONS);
        this.clientParams.key = this.key;
        this.clientParams.id = this.id;
        this.clientParams.targetName = this.title;
        // @NOTE: we need to send the layer name for later calculate the animation depth and show the animation over
        // the proper layer.
        this.clientParams.layerName = props.layer_name;
    }

    async runAdditionalSetup()
    {
        // @NOTE: implement what you need here.
        Logger.info('Method not implemented "runAdditionalSetup" on: '+this.key);
    }

}

module.exports.BaseObject = BaseObject;
