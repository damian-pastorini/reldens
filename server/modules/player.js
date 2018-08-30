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
        this.x = Math.floor(Math.random() * 400);
        this.y = Math.floor(Math.random() * 400);
    }

}

exports.player = Player;
