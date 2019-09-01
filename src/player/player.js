const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const type = schema.type;
const localConfig = require('../../config/config');

class Player extends Schema
{

    constructor(data)
    {
        super();
        // player data:
        this.id = data.id;
        this.sessionId = '';
        this.role_id = data.role_id;
        this.status = data.status;
        this.username = data.username;
        this.isBusy = false;
        this.p2body = false;
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
            // @TODO: initial position will be part of the configuration in the database.
            if(localConfig.hasOwnProperty('initialScene') && localConfig.initialScene.hasOwnProperty('scene')){
                // initial position in initial scene (town):
                this.scene = localConfig.initialScene.scene;
                this.x = localConfig.initialScene.x;
                this.y = localConfig.initialScene.y;
                this.dir = localConfig.initialScene.dir;
            } else {
                throw new Error('ERROR - Missing initial scene configuration.');
            }
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
