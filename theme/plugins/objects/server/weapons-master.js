/**
 *
 * Reldens - Merchant
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/lib/objects/server/npc-object');
const { GameConst } = require('reldens/lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class WeaponsMaster extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.runOnAction = true;
        this.playerVisible = true;
        // assign extra params:
        this.clientParams.enabled = true;
        this.clientParams.ui = true;
        // @TODO - BETA - All the NPC info will be coming from the storage.
        this.content = `Hi I'm the weapons master, choose your weapon and go kill some monsters!`;
        this.options = {
            op1: {key: 'axe', label: 'Axe', value: 1, icon: 'axe'},
            op2: {key: 'spear', label: 'Spear', value: 2, icon: 'spear'}
        };
        this.sendInvalidOptionMessage = true;
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        await super.executeMessageActions(client, data, room, playerSchema);
        let optionIdx = 'op'+data.value;
        if(!this.isValidOption(data) || !this.isValidIndexValue(optionIdx, room, client)){
            return false;
        }
        let selectedOption = this.options[optionIdx];
        // only give each item once:
        if(sc.hasOwn(playerSchema.inventory.manager.items, selectedOption.key)){
            let contentMessage = 'You already have the item.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let itemObj = playerSchema.inventory.manager.createItemInstance(selectedOption.key);
        playerSchema.inventory.manager.addItem(itemObj).then(() => {
            let contentMessage = 'Do not forget to equip your new '+selectedOption.label+' before go to the battle.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
        }).catch((err) => {
            Logger.error([`Error while adding item "${selectedOption.key}":`, err]);
            let contentMessage = 'Sorry, I was not able to give you the item, contact the admin.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        });
    }

}

module.exports.WeaponsMaster = WeaponsMaster;
