/**
 *
 * Reldens - Merchant
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/lib/objects/server/object/type/npc-object');
const { GameConst } = require('reldens/lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class WeaponsMaster extends NpcObject
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        let superResult = await super.executeMessageActions(client, data, room, playerSchema);
        if(false === superResult){
            return false;
        }
        let selectedOption = sc.get(this.options, data.value, false);
        if(false === selectedOption){
            return false;
        }
        if(sc.hasOwn(playerSchema.inventory.manager.items, selectedOption.key)){
            let contentMessage = 'You already have the item.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let itemObj = playerSchema.inventory.manager.createItemInstance(selectedOption.key);
        if(false === await playerSchema.inventory.manager.addItem(itemObj)){
            Logger.error([`Error while adding item "${selectedOption.key}" on "${this.key}".`]);
            let contentMessage = 'Sorry, I was not able to give you the item, contact the admin.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let contentMessage = 'Do not forget to equip your new '+selectedOption.label+' before go to the battle.';
        client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
    }

}

module.exports.WeaponsMaster = WeaponsMaster;
