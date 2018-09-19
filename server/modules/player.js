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
        // @TODO: state will be used to save player state at logout.
        this.state = data.state;
        // initial scene and position:
        this.scene = 'Town';
        this.x = 225;
        this.y = 280;
        this.dir = share.DOWN;
        this.mov = false;
    }

}

exports.player = Player;
