/**
 *
 * Reldens - BodyState
 *
 * BodyState schema, this class get a body state (position, direction, scene, etc.) data and keep the state
 * in sync with the client.
 *
 */

const { Schema, type } = require('@colyseus/schema');

class BodyState extends Schema
{

    constructor(data)
    {
        super();
        this.room_id = data.room_id;
        this.scene = data.scene;
        this.x = parseFloat(data.x);
        this.y = parseFloat(data.y);
        this.dir = data.dir;
        this.mov = false;
    }

}

type('number')(BodyState.prototype, 'room_id');
type('string')(BodyState.prototype, 'scene');
type('number')(BodyState.prototype, 'x');
type('number')(BodyState.prototype, 'y');
type('string')(BodyState.prototype, 'dir');
type('boolean')(BodyState.prototype, 'mov');

module.exports.BodyState = BodyState;
