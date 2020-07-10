
const { EnemyObject } = require('reldens/packages/objects/server/enemy-object');
const { Logger } = require('@reldens/utils');

class Enemy1Object extends EnemyObject
{

    runAdditionalSetup(eventsManager)
    {
        eventsManager.on('reldens.battleEnded', this.onBattleEnd.bind(this));
        let dataArr = eventsManager.listeners('reldens.battleEnded');
        this.battleEndListener = dataArr[dataArr.length -1];
    }

    // eslint-disable-next-line no-unused-vars
    onBattleEnd(playerSchema, pveInstance, actionData)
    {
        // validate unique id for battle end event:
        if(this.uid !== pveInstance.targetObject.uid){
            return false;
        }
        let treeBranch = playerSchema.inventory.createItemInstance('branch');
        playerSchema.inventory.manager.addItem(treeBranch).catch((err) => {
            Logger.error(['Error while adding item "branch":', err]);
        });
    }

}

module.exports.Enemy1Object = Enemy1Object;
