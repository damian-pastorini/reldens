/**
 *
 * Reldens - Enemy
 *
 */

const { EnemyObject } = require('reldens/lib/objects/server/object/type/enemy-object');
const { Logger, sc } = require('@reldens/utils');

class Enemy1Object extends EnemyObject
{

    constructor(props)
    {
        super(props);
        this.isAggressive = true;
    }

    async runAdditionalRespawnSetup()
    {
        await super.runAdditionalRespawnSetup();
        this.events.onWithKey(
            this.getBattleEndEvent(),
            await this.onBattleEnd.bind(this),
            this.getEventRemoveKey(),
            this.getEventMasterKey()
        );
        let dataArr = this.events.listeners('reldens.battleEnded');
        this.battleEndListener = dataArr[dataArr.length -1];
    }

    // eslint-disable-next-line no-unused-vars
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
