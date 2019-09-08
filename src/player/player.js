const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const type = schema.type;
const initialScene = require('../../config/initial-scene');

class Player extends Schema
{

    constructor(data, sessionId)
    {
        super();
        // player data:
        this.id = data.id;
        this.sessionId = sessionId;
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
            // initial position in initial scene (town):
            this.scene = initialScene.scene;
            this.x = initialScene.x;
            this.y = initialScene.y;
            this.dir = initialScene.dir;
        }
        this.mov = false;
    }

    updateLastLogin()
    {
        let queryString = `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE username='${this.username}'`;
        let lastLoginProm = DataLink.query(queryString);
        lastLoginProm.catch((err) => {
            console.log('ERROR - Update last login query fail.', err, queryString);
        });
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
