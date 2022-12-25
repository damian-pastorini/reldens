/**
 *
 * Reldens - Enemy
 *
 */

const { EnemyObject } = require('reldens/lib/objects/server/object/type/enemy-object');
const { Logger, sc } = require('@reldens/utils');

class Enemy1Object extends EnemyObject
{

    async onBattleEnd(playerSchema, pveInstance, actionData)
    {
        // validate unique id for battle end event:
        if(this.uid !== pveInstance.targetObject.uid){
            return false;
        }
        // @TODO - BETA - Rewards as items or experience will be coming from the storage.
        if(sc.hasOwn(playerSchema, 'skillsServer')){
            await playerSchema.skillsServer.classPath.addExperience(50);
        }
        let treeBranch = playerSchema.inventory.manager.createItemInstance('branch');
        let addResult = await playerSchema.inventory.manager.addItem(treeBranch);
        if(false === addResult){
            Logger.error(['Error while adding item "branch".']);
        }
    }

}

module.exports.Enemy1Object = Enemy1Object;
