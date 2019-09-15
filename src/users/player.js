const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const type = schema.type;
const initialState = require('../../config/initial-state');

class Player extends Schema
{

    constructor(data, sessionId)
    {
        super();
        this.stats = data.players[0].stats;
        // player data:
        this.id = data.id;
        this.sessionId = sessionId;
        this.role_id = data.role_id;
        this.status = data.status;
        this.username = data.username;
        this.isBusy = false;
        this.p2body = false;
        // @TODO: fix state.
        // initial scene and position:
        if(data.state){
            // parse user state:
            let state = JSON.parse(data.state);
            this.state = state;
            // use saved scene and position if available:
            if(state.scene){
                // use user scene:
                this.scene = state.scene;
                this.x = parseFloat(state.x);
                this.y = parseFloat(state.y);
                this.dir = state.dir;
            }
        } else {
            // initial position in initial scene (town):
            this.scene = initialState.scene;
            this.x = initialState.x;
            this.y = initialState.y;
            this.dir = initialState.dir;
        }
        this.mov = false;
    }

}

type('string')(Player.prototype, 'sessionId');
type('string')(Player.prototype, 'username');
type('number')(Player.prototype, 'status');
type('number')(Player.prototype, 'x');
type('number')(Player.prototype, 'y');
type('string')(Player.prototype, 'scene');
type('string')(Player.prototype, 'dir');
type('boolean')(Player.prototype, 'mov');
type('boolean')(Player.prototype, 'isBusy');

module.exports = Player;
