const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const type = schema.type;

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
    }

}

type('number')(PlayerState.prototype, 'room_id');
type('string')(PlayerState.prototype, 'scene');
type('number')(PlayerState.prototype, 'x');
type('number')(PlayerState.prototype, 'y');
type('string')(PlayerState.prototype, 'dir');

module.exports = PlayerState;
