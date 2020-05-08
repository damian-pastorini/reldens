
const { EnemyObject } = require('reldens/packages/objects/server/enemy-object');
const { ItemBase } = require('@reldens/items-system');
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
        // @TODO: server MUST LOAD all the items available, so we can later can create items instances easier.
        let itemProps = {
            id: 2,
            key: 'branch',
            manager: playerSchema.inventory.manager,
            label: 'Tree branch',
            description: 'An useless tree branch (for now)',
            qty: 1
        };
        let treeBranch = new ItemBase(itemProps);
        // @TODO: include a setProps method on item-base.
        treeBranch.item_id = 2; // this value will be always coming from the database.
        playerSchema.inventory.manager.addItem(treeBranch).catch((err) => {
            Logger.error(['Error while adding item "coins":', err]);
        });
    }

}

module.exports.Enemy1Object = Enemy1Object;
