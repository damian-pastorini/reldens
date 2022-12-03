/**
 *
 * Reldens - SceneGravity
 *
 */

const { RoomScene } = require('reldens/lib/rooms/server/scene');
const { P2worldGravity } = require('reldens/lib/world/server/p2world-gravity');

class SceneGravity extends RoomScene
{

    createWorldInstance(data)
    {
        return new P2worldGravity(data);
    }

}

module.exports.SceneGravity = SceneGravity;
