/**
 *
 * Reldens - Enemy
 *
 */

const { EnemyObject } = require('reldens/lib/objects/server/enemy-object');
const { sc } = require('@reldens/utils');

class Enemy2Object extends EnemyObject
{

    runAdditionalSetup()
    {
        this.events.onWithKey(
            this.getBattleEndEvent(),
            this.onBattleEnd.bind(this),
            this.getEventRemoveKey(),
            this.getEventMasterKey()
        );
        let dataArr = this.events.listeners('reldens.battleEnded');
        this.battleEndListener = dataArr[dataArr.length -1];
    }

    // eslint-disable-next-line no-unused-vars
    onBattleEnd(playerSchema, pveInstance, actionData)
    {
        // validate unique id for battle end event:
        if(this.uid !== pveInstance.targetObject.uid){
            return false;
        }
        if(sc.hasOwn(playerSchema, 'skillsServer')){
            playerSchema.skillsServer.classPath.addExperience(20);
        }
    }

}

module.exports.Enemy2Object = Enemy2Object;
