

class User
{

    constructor(props)
    {
        this.model = props.userModel;
        this.availablePlayers = {};
        this.player = {
            schema: props.playerSchema,
            body: props.body
        }
    }

}

module.exports = User;
