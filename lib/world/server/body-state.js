/**
 *
 * Reldens - BodyState
 *
 * Colyseus schema representing the synchronized state of a physics body across server and clients.
 *
 */

const { Schema, type } = require('@colyseus/schema');
const { GameConst } = require('../../game/constants');

/**
 * @typedef {Object} BodyStateData
 * @property {number} room_id
 * @property {string} scene
 * @property {string} [key]
 * @property {number} x
 * @property {number} y
 * @property {string} dir
 * @property {number} [inState]
 */
class BodyState extends Schema
{

    /**
     * @param {BodyStateData} data
     */
    constructor(data)
    {
        super();
        /** @type {number} */
        this.room_id = data.room_id;
        /** @type {string} */
        this.scene = data.scene;
        /** @type {string} */
        this.key = data.key || '';
        /** @type {number} */
        this.x = parseFloat(data.x);
        /** @type {number} */
        this.y = parseFloat(data.y);
        /** @type {string} */
        this.dir = data.dir;
        /** @type {boolean} */
        this.mov = false;
        /** @type {number} */
        this.inState = data.inState || GameConst.STATUS.ACTIVE;
    }

    /**
     * @param {BodyState} bodyState
     * @returns {BodyState}
     */
    sync(bodyState)
    {
        this.room_id = bodyState.room_id;
        this.scene = bodyState.scene;
        this.key = bodyState.key;
        this.x = parseFloat(bodyState.x);
        this.y = parseFloat(bodyState.y);
        this.dir = bodyState.dir;
        this.mov = bodyState.mov;
        this.inState = bodyState.inState;
        return this;
    }

}

type('number')(BodyState.prototype, 'room_id');
type('string')(BodyState.prototype, 'scene');
type('string')(BodyState.prototype, 'key');
type('number')(BodyState.prototype, 'x');
type('number')(BodyState.prototype, 'y');
type('string')(BodyState.prototype, 'dir');
type('boolean')(BodyState.prototype, 'mov');
type('number')(BodyState.prototype, 'inState');

module.exports.BodyState = BodyState;
