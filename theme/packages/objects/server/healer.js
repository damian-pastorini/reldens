/**
 *
 * Reldens - Healer
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/packages/objects/server/npc-object');
const { GameConst } = require('reldens/packages/game/constants');
const { Logger } = require('@reldens/utils');

class Healer extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.runOnAction = true;
        this.playerVisible = true;
        // assign extra params:
        this.clientParams.enabled = true;
        // @TODO: all the npc info will be coming from the storage.
        this.clientParams.ui = true;
        this.content = 'Hi there! I can restore your health, would you like me to do it?';
        this.options = {
            op1: {label: 'Heal HP', value: 1},
            op2: {label: 'Nothing...', value: 2}
        };
        this.sendInvalidOptionMessage = true;
    }

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        super.parseMessageAndRunActions(client, data, room, playerSchema);
        let optionIdx = 'op'+data.value;
        if(!this.isValidOption(data) || !this.isValidIndexValue(optionIdx, room, client)){
            return false;
        }
        if(this.options[optionIdx].value === 1){
            // update and save the player:
            playerSchema.stats.hp = playerSchema.initialStats.hp;
            room.savePlayerStats(playerSchema, client).then(() => {
                // update ui box:
                let activationData = {act: GameConst.UI, id: this.id, content: 'Your HP points has been restored!'};
                // update the target:
                room.send(client, activationData);
            }).catch((err) => {
                Logger.error(err);
            });
        } else {
            let healPotion = playerSchema.inventory.createItemInstance('heal_potion_20');
            playerSchema.inventory.manager.addItem(healPotion).then(() => {
                let responseMessage = 'Then I will give you an item for later, you never know...';
                let activationData = {act: GameConst.UI, id: this.id, content: responseMessage};
                room.send(client, activationData);
            }).catch((err) => {
                Logger.error(['Error while adding item "heal_potion_20":', err]);
                let contentMessage = 'Sorry, I was not able to give you the item, contact the admin.';
                room.send(client, {act: GameConst.UI, id: this.id, content: contentMessage});
                return false;

            });
        }
    }

}

module.exports.Healer = Healer;
