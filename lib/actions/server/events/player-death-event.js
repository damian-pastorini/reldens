/**
 *
 * Reldens - PlayerDeathEvent
 *
 */

class PlayerDeathEvent
{

    constructor(props)
    {
        this.targetSchema = props.targetSchema;
        this.room = props.room;
        this.targetClient = props.targetClient
        this.affectedProperty = props.affectedProperty;
        this.attackerPlayer = props.attackerPlayer;
    }

}

module.exports.PlayerDeathEvent = PlayerDeathEvent;
