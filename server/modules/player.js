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
        this.x = 225;
        this.y = 280;
        this.direction = '';
    }

}

exports.player = Player;
