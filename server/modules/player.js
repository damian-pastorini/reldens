const share = require('../../shared/constants');

class Player
{

    constructor(data)
    {
        // player data:
        this.id = data.id;
        this.sessionId = '';
        this.role_id = data.role_id;
        this.status = data.status;
        this.username = data.username;
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
            this.scene = share.TOWN;
            this.x = 225;
            this.y = 280;
            this.dir = share.DOWN;
        }
        this.mov = false;
    }

}

exports.player = Player;
