/**
 *
 * Reldens - ObjectBodyState
 *
 * ObjectBodyState schema, this class get a body state (position, direction, scene, etc.) data and keep the state
 * in sync with the client.
 *
 */

const { type } = require('@colyseus/schema');
const { BodyState } = require('./body-state');

class ObjectBodyState extends BodyState
{

    constructor(data)
    {
        super(data);
        this.id = data.id;
    }

}

type('number')(ObjectBodyState.prototype, 'id');

module.exports.ObjectBodyState = ObjectBodyState;
