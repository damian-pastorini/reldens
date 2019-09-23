

class User
{

    constructor(props)
    {
        this.model = props.userModel;
        this.availablePlayers = {};
        this.player = {};
    }

    setCurrentPlayer(props)
    {
        this.player.schema = props.playerSchema;
        this.player.body = props.body;
    }

}

module.exports = User;
