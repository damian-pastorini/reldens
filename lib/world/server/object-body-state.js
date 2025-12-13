/**
 *
 * Reldens - ObjectBodyState
 *
 * Colyseus schema extending BodyState to represent object-specific body state with auto-direction support.
 *
 */

const { type } = require('@colyseus/schema');
const { BodyState } = require('./body-state');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./body-state').BodyStateData} BodyStateData
 *
 * @typedef {Object} ObjectBodyStateData
 * @property {number} id
 * @property {boolean} [autoDirection]
 */
class ObjectBodyState extends BodyState
{

    /**
     * @param {BodyStateData & ObjectBodyStateData} data
     */
    constructor(data)
    {
        super(data);
        /** @type {number} */
        this.id = data.id;
        /** @type {boolean} */
        this.autoDirection = sc.get(data, 'autoDirection', true);
    }

}

type('number')(ObjectBodyState.prototype, 'id');

module.exports.ObjectBodyState = ObjectBodyState;
