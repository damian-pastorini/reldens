/**
 *
 * Reldens - Quest NPC
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/lib/objects/server/object/type/npc-object');
const { GameConst } = require('reldens/lib/game/constants');

class QuestNpc extends NpcObject
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        let superResult = await super.executeMessageActions(client, data, room, playerSchema);
        if(false === superResult){
            return false;
        }
        let selectedOption = this.options[data.value];
        if(!selectedOption){
            return false;
        }
        if('' === (selectedOption.value).toString()){
            return;
        }
        if('2' === (selectedOption.value).toString()){
            client.send('*', {act: GameConst.CLOSE_UI_ACTION, id: this.id});
            return true;
        }
        // check the amount of coins:
        let coinsItem = playerSchema.inventory.manager.findItemByKey('coins');
        if(false !== coinsItem && 10 <= coinsItem.qty){
            let contentMessage = 'You have too many already.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        // check and remove a tree branch if possible:
        let treeItem = playerSchema.inventory.manager.findItemByKey('branch');
        if(false === treeItem){
            let contentMessage = 'You do not have any tree branches!';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let removeResult = await playerSchema.inventory.manager.decreaseItemQty(treeItem.uid, 1);
        if(false === removeResult){
            console.log(`Error while adding item "${selectedOption.key}"`);
            let contentMessage = 'Sorry, I was not able to remove the required item, contact the administrator.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        // add the new coin:
        coinsItem = playerSchema.inventory.manager.createItemInstance('coins');
        if(false === await playerSchema.inventory.manager.addItem(coinsItem)){
            console.log(`Error while adding item "${selectedOption.key}"`);
            let contentMessage = 'Sorry, I was not able to give you the item, contact the administrator.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let activationData = {act: GameConst.UI, id: this.id, content: 'All yours!'};
        client.send('*', activationData);
        return true;
    }

}

module.exports.QuestNpc = QuestNpc;
