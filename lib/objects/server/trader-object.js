/**
 *
 * Reldens - TraderObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { NpcObject } = require('./npc-object');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../constants');
const { sc, Logger} = require('@reldens/utils');

class TraderObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        // this is a hardcoded property for this specific object type:
        this.type = ObjectsConst.TYPE_TRADER;
        this.clientParams.type = ObjectsConst.TYPE_TRADER;
        this.runOnAction = true;
        this.playerVisible = true;
        // assign extra params:
        this.clientParams.enabled = true;
        this.clientParams.ui = true;
        // @TODO - BETA - All the NPC info will be coming from the storage.
        this.content = 'Hi there! What would you like to do?';
        this.options = {
            op1: {label: 'Buy', value: 1},
            op2: {label: 'Sell', value: 2},
            op3: {label: 'Trade', value: 3}
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
        // @TODO - BETA - Replace options by default trader inventory as options.
        let selectedOption = this.options[optionIdx];
        if(1 !== selectedOption.value){
            let activationData = {act: GameConst.UI, id: this.id, content: 'Ok...'};
            client.send('*', activationData);
            return;
        }
        // only give each item once:
        if(sc.hasOwn(playerSchema.inventory.manager.items, 'coins')){
            let contentMessage = 'You have too many already.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let coin = playerSchema.inventory.manager.createItemInstance('coins');
        playerSchema.inventory.manager.addItem(coin).then(() => {
            let activationData = {act: GameConst.UI, id: this.id, content: 'All yours!'};
            client.send('*', activationData);
        }).catch((err) => {
            Logger.error([`Error while adding item "${selectedOption.key}":`, err]);
            let contentMessage = 'Sorry, I was not able to give you the item, contact the admin.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        });
    }

}

module.exports.TraderObject = TraderObject;
