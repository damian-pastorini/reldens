/**
 *
 * Reldens - PlayerState
 *
 * PlayerState schema, this class get the player state (position, direction, scene, etc.) data and keep the state
 * in sync.
 *
 */

const { Schema, type } = require('@colyseus/schema');

class PlayerState extends Schema
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

type('number')(PlayerState.prototype, 'room_id');
type('string')(PlayerState.prototype, 'scene');
type('number')(PlayerState.prototype, 'x');
type('number')(PlayerState.prototype, 'y');
type('string')(PlayerState.prototype, 'dir');
type('boolean')(PlayerState.prototype, 'mov');

module.exports.PlayerState = PlayerState;
