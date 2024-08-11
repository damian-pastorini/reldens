/**
 *
 * Reldens - BattleEndedEvent
 *
 */

class BattleEndedEvent
{

    constructor(props)
    {
        this.playerSchema = props.playerSchema;
        this.pve = props.pve
        this.actionData = props.actionData;
        this.room = props.room;
    }

}

module.exports.BattleEndedEvent = BattleEndedEvent;
