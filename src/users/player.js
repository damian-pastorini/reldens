const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const type = schema.type;
// const PlayerState = require('./player-state');

class Player extends Schema
{

    constructor(data, sessionId)
    {
        super();
        let player = data.players[0];
        this.stats = player.stats;
        // player data:
        this.id = data.id;
        this.sessionId = sessionId;
        this.role_id = data.role_id;
        this.status = data.status;
        this.username = data.username;
        this.isBusy = false;
        this.p2body = false;
        // set scene and position:
        if(player.state){
            this.state = player.state;
            // use saved scene and position if available:
            if(player.scene){
                // use user scene:
                this.scene = player.scene;
                this.x = parseFloat(this.state.x);
                this.y = parseFloat(this.state.y);
                this.dir = this.state.dir;
            } else {
                throw new Error('ERROR - Missing user state scene data.');
            }
            // this.state = new PlayerState(player.state);
        } else {
            throw new Error('ERROR - Missing user state data.');
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
// schema.defineTypes(Player, { state: PlayerState });

module.exports = Player;
