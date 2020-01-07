/**
 *
 * Reldens - EnemyObject
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 * The main point here is that this is just and example, and you could even create several NPCs and make them run any
 * kind of actions at any time. Here you can see a simple message but it could do literally anything.
 *
 */

const { NpcObject } = require('./npc-object');
const { ObjectsConst } = require('../constants');

class EnemyObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.type = ObjectsConst.TYPE_ENEMY;
        this.runOnAction = true;
        this.runOnHit = true;
        this.roomVisible = true;
    }

}

module.exports.EnemyObject = EnemyObject;
