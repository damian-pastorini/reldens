/**
 *
 * Reldens - Enemy
 *
 */

const { EnemyObject } = require('reldens/lib/objects/server/object/type/enemy-object');
const { sc } = require('@reldens/utils');

class Enemy2Object extends EnemyObject
{

    async onBattleEnd(playerSchema, pveInstance, actionData)
    {
        /*
        // validate unique id for battle end event:
        if(this.uid !== pveInstance.targetObject.uid){
            return false;
        }
        // @TODO - BETA - Rewards as items or experience will be coming from the storage.
        if(sc.hasOwn(playerSchema, 'skillsServer')){
            await playerSchema.skillsServer.classPath.addExperience(20);
        }
        */
    }

}

module.exports.Enemy2Object = Enemy2Object;
