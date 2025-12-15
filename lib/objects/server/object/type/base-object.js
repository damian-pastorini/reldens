/**
 *
 * Reldens - BaseObject
 *
 * Base class for all game objects with interaction area capabilities.
 *
 */

const { ObjectsConst } = require('../../../constants');
const { InteractionArea, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../../../world/server/physical-body').PhysicalBody} PhysicalBody
 */
class BaseObject extends InteractionArea
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super();
        // assign all the properties from the storage automatically as part of this object:
        Object.assign(this, props);
        /** @type {EventsManager} */
        this.events;
        if(!this.events){
            Logger.error('EventsManager undefined in BaseObject.');
        }
        /** @type {Object} */
        this.config;
        if(!this.config){
            Logger.error('Config undefined in BaseObject.');
        }
        /** @type {BaseDataServer} */
        this.dataServer;
        if(!this.dataServer){
            Logger.error('Data Server undefined in BaseObject.');
        }
        /** @type {number|string} */
        this.appendIndex = sc.get(props, 'tile_index', props.id);
        /** @type {string} */
        this.objectIndex = props.layer_name + (this.appendIndex || '-idx-1');
        /** @type {string} */
        this.key = props.client_key;
        /** @type {string} */
        this.uid = this.key +'-'+ Date.now();
        /** @type {string} */
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.BASE;
        this.setDefaultProperties();
        this.mapClientParams(props);
        this.mapPrivateParams(props);
    }

    /**
     * @param {string} [suffix]
     * @returns {string}
     */
    eventUniqueKey(suffix)
    {
        return this.eventsPrefix+'.'+(new Date()).getTime()+(suffix ? '.'+suffix : '');
    }

    setDefaultProperties()
    {
        /** @type {boolean} */
        this.runOnHit = false;
        /** @type {PhysicalBody|false} */
        this.objectBody = false;
        /** @type {boolean} */
        this.runOnAction = false;
        /** @type {boolean} */
        this.playerVisible = false;
        /** @type {boolean} */
        this.roomVisible = false;
        /** @type {Object} */
        this.clientParams = {};
    }

    /**
     * @param {Object} props
     */
    mapPrivateParams(props)
    {
        // @NOTE: private params will override the object properties:
        this.privateParamsRaw = props.private_params;
        let privateParamsObject = sc.toJson(this.privateParamsRaw, {});
        Object.assign(this, privateParamsObject);
    }

    /**
     * @param {Object} props
     */
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

    /**
     * @returns {Promise<void>}
     */
    async runAdditionalSetup()
    {
        // @NOTE: implement what you need here.
        Logger.info('Method not implemented "runAdditionalSetup" on: '+this.key);
    }

}

module.exports.BaseObject = BaseObject;
