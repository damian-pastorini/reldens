class Player
{

    constructor()
    {
        this.id = '';
        this.x = Math.floor(Math.random() * 400);
        this.y = Math.floor(Math.random() * 400);
    }

}

exports.player = Player;
