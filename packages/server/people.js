/**
 *
 * Reldens - People
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 * The main point here is that this is just and example, and you could even create several NPCs and make them run any
 * kind of actions at any time. Here you can see a simple message but it could do literally anything.
 *
 */

const NpcObject = require('reldens/src/objects/npc-object');

class People extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.runOnAction = true;
        // assign extra public params:
        this.publicParamsObj = Object.assign(this.publicParamsObj, {
            enabled: true
        });
    }

}

module.exports = People;