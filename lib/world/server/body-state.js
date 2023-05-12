/**
 *
 * Reldens - BodyState
 *
 */

const { Schema, type } = require('@colyseus/schema');
const { GameConst } = require('../../game/constants');

class BodyState extends Schema
{

    constructor(data)
    {
        super();
        this.room_id = data.room_id;
        this.scene = data.scene;
        this.key = data.key || '';
        this.x = parseFloat(data.x);
        this.y = parseFloat(data.y);
        this.dir = data.dir;
        this.mov = false;
        this.inState = GameConst.STATUS.ACTIVE;
    }

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
