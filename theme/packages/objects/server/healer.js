/**
 *
 * Reldens - Healer
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/packages/objects/server/npc-object');

class Healer extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.runOnAction = true;
        this.playerVisible = true;
        // assign extra params:
        this.clientParams.enabled = true;
        // @TODO: all the npc info will be coming from the storage.
        this.clientParams.ui = true;
        this.content = 'Hi there! I can restore your health, would you like me to do it?';
    }

}

module.exports.Healer = Healer;
