/**
 *
 * Reldens - Healer
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/lib/objects/server/object/type/npc-object');
const { GameConst } = require('reldens/lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class Healer extends NpcObject
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        let superResult = await super.executeMessageActions(client, data, room, playerSchema);
        if(false === superResult){
            return false;
        }
        let givePotions = true;
        let selectedOption = (sc.get(this.options, data.value, {})?.value || '').toString();
        if('' === selectedOption){
            return false;
        }
        if('1' === selectedOption){
            givePotions = false;
            this.restoreHp(room, playerSchema, client);
        }
        if('3' === selectedOption){
            givePotions = false;
            this.restoreMp(playerSchema, room, client);
        }
        if(givePotions){
            await this.giveRewards(playerSchema, client);
        }
    }

    restoreMp(playerSchema, room, client)
    {
        // update and save the player:
        playerSchema.stats.mp = playerSchema.statsBase.mp;
        room.savePlayerStats(playerSchema, client).then(() => {
            // update ui box:
            let activationData = {act: GameConst.UI, id: this.id, content: 'Your MP points has been restored!'};
            // update the target:
            client.send('*', activationData);
        }).catch((err) => {
            Logger.error(err);
        });
    }

    restoreHp(room, playerSchema, client)
    {
        // update and save the player:
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        playerSchema.stats[affectedProperty] = playerSchema.statsBase[affectedProperty];
        room.savePlayerStats(playerSchema, client).then(() => {
            // update ui box:
            let activationData = {act: GameConst.UI, id: this.id, content: 'Your HP points has been restored!'};
            // update the target:
            client.send('*', activationData);
        }).catch((err) => {
            Logger.error(err);
        });
    }

    async giveRewards(playerSchema, client)
    {
        let healPotion = playerSchema.inventory.manager.createItemInstance('heal_potion_20');
        let magicPotion = playerSchema.inventory.manager.createItemInstance('magic_potion_20');
        let result = await playerSchema.inventory.manager.addItems([healPotion, magicPotion]);
        if(!result){
            Logger.error(['Error while adding items.', result, playerSchema]);
            let contentMessage = 'Sorry, I was not able to give you any items, contact the administrator.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let responseMessage = 'Then I will give you some items for later, you never know...';
        let activationData = {act: GameConst.UI, id: this.id, content: responseMessage};
        client.send('*', activationData);
        return true;
    }
}

module.exports.Healer = Healer;
