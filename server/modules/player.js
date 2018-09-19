// @TODO: create a single js file for constants and require it.
var share = require('../../shared/constants');

class Player
{

    constructor(data)
    {
        // player data:
        this.id = data.id;
        this.sessionId = '';
        this.role_id = data.role_id;
        this.status = data.status;
        // initial scene and position:
        // @TODO: this will be updated from the save player state in the database.
        this.scene = 'Town';
        this.x = 225;
        this.y = 280;
        this.dir = share.DOWN;
        this.mov = false;
        // @TODO: state will be used to save player state.
        this.state = data.state;
    }

}

exports.player = Player;
