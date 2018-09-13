var share = require('../../shared/constants');

class Player
{

    constructor(data)
    {
        // console.log('data: ', data);
        this.id = data.id;
        this.sessionId = '';
        this.role_id = data.role_id;
        this.status = data.status;
        this.state = data.state;
        // initial position:
        this.x = 225; // Math.floor(Math.random() * 400);
        this.y = 280; // Math.floor(Math.random() * 400);
        this.dir = share.DOWN;
        this.mov = false;
    }

}

exports.player = Player;
