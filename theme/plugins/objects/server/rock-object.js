/**
 *
 * Reldens - RockObject
 *
 */

const { TimingObject } = require('reldens/lib/objects/server/object/type/timing-object');
const { GameConst } = require('reldens/lib/game/constants');

class RockObject extends TimingObject
{

    respawnStateTime = 100;

    async runAdditionalRespawnSetup()
    {
        this.events.onWithKey(
            'reldens.sceneRoomOnCreate',
            (room) => {
                room.messageActions[this.key] = this;
            },
            this.eventUniqueKey('registerMessageAction'),
            this.uid
        );
    }

    onBeforeRestore()
    {
        this.objectBody.bodyState.inState = GameConst.STATUS.AVOID_INTERPOLATION;
    }

    onSetActive()
    {
        this.objectBody.setShapesCollisionGroup(this.objectBody.originalCollisionGroup);
    }

    isValidId(data)
    {
        return this.key === data?.id || false || Number(this.id) === Number(data?.id || false);
    }

    async completeTiming(client, room, playerSchema)
    {
        let newItem = playerSchema.inventory.manager.createItemInstance(this.itemKey);
        let addResult = await playerSchema.inventory.manager.addItem(newItem);
        if(false === addResult){
            this.cancelTiming(client);
            return;
        }
        this.isActive = false;
        this.objectBody.setShapesCollisionGroup(0);
        this.objectBody.bodyState.inState = GameConst.STATUS.DISABLED;
        client.send('*', {act: 'timingComplete', id: this.id, rewarded: true, itemKey: this.itemKey});
        if(!this.respawnBehavior){
            return;
        }
        this.respawnBehavior.execute(room);
    }

}

module.exports.RockObject = RockObject;
