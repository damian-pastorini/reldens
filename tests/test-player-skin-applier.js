/**
 *
 * Reldens - Test Player Skin Applier
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { PlayerSkinApplier } = require('../lib/users/server/player-skin-applier');
const { GameConst } = require('../lib/game/constants');
const { ItemsEvents } = require('@reldens/items-system');

class TestPlayerSkinApplier extends BaseTest
{

    createSetup(equippedSkinsKeys)
    {
        let items = {
            potion: GameplayPlayerBuilder.createItem('potion'),
            warlockRobe: GameplayPlayerBuilder.createItem('warlockRobe', {
                skinKey: 'warlock',
                equipped: -1 !== equippedSkinsKeys.indexOf('warlock')
            }),
            mageRobe: GameplayPlayerBuilder.createItem('mageRobe', {
                skinKey: 'mage',
                equipped: -1 !== equippedSkinsKeys.indexOf('mage')
            })
        };
        let inventoryManager = GameplayPlayerBuilder.createInventoryManager(items);
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
        playerSchema.inventory = {manager: inventoryManager};
        return {
            items,
            inventoryManager,
            playerSchema,
            event: {inventoryServer: {manager: inventoryManager}, playerSchema}
        };
    }

    async testJoiningPlayerGetsTheEquippedSkin()
    {
        await this.test('a joining player gets its equipped skin and the equip changes are listened', async () => {
            let setup = this.createSetup(['warlock']);
            this.assert.strictEqual(new PlayerSkinApplier().onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'warlock');
            this.assert.deepStrictEqual(
                Object.keys(setup.inventoryManager.listenedEvents),
                [ItemsEvents.EQUIP_ITEM, ItemsEvents.UNEQUIP_ITEM]
            );
        });
    }

    async testJoiningPlayerWithoutSkinKeepsItsAvatar()
    {
        await this.test('a joining player without an equipped skin or inventory keeps its avatar', async () => {
            let setup = this.createSetup([]);
            let playerSkinApplier = new PlayerSkinApplier();
            this.assert.strictEqual(playerSkinApplier.onCreatePlayerInventoryAfter(setup.event), false);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'journeyman');
            let withoutInventoryEvent = {playerSchema: setup.playerSchema};
            this.assert.strictEqual(playerSkinApplier.onCreatePlayerInventoryAfter(withoutInventoryEvent), false);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'journeyman');
        });
    }

    async testEquipSkinChangesTheAvatar()
    {
        await this.test('equipping a skin item changes the avatar and the other items are ignored', async () => {
            let setup = this.createSetup([]);
            new PlayerSkinApplier().onCreatePlayerInventoryAfter(setup.event);
            let equipListener = setup.inventoryManager.listenedEvents[ItemsEvents.EQUIP_ITEM];
            this.assert.strictEqual(equipListener(setup.items.potion), false);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'journeyman');
            setup.items.warlockRobe.equipped = true;
            this.assert.strictEqual(equipListener(setup.items.warlockRobe), true);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'warlock');
        });
    }

    async testUnequipSkinRestoresTheClassPathAvatar()
    {
        await this.test('unequipping the skin restores the class path avatar', async () => {
            let setup = this.createSetup(['warlock']);
            new PlayerSkinApplier().onCreatePlayerInventoryAfter(setup.event);
            setup.items.warlockRobe.equipped = false;
            let unequipListener = setup.inventoryManager.listenedEvents[ItemsEvents.UNEQUIP_ITEM];
            this.assert.strictEqual(unequipListener(setup.items.warlockRobe), true);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'journeyman');
        });
    }

    async testUnequipSkinRestoresAnotherEquippedSkin()
    {
        await this.test('unequipping a skin restores another equipped skin', async () => {
            let setup = this.createSetup(['warlock', 'mage']);
            let playerSkinApplier = new PlayerSkinApplier();
            setup.playerSchema.avatarKey = 'warlock';
            setup.items.warlockRobe.equipped = false;
            this.assert.strictEqual(playerSkinApplier.removeSkin(setup.playerSchema, setup.items.warlockRobe), true);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'mage');
        });
    }

    async testUnequipOfAnotherSkinOrItemChangesNothing()
    {
        await this.test('unequipping another skin or an item without skin changes nothing', async () => {
            let setup = this.createSetup(['mage']);
            let playerSkinApplier = new PlayerSkinApplier();
            setup.playerSchema.avatarKey = 'mage';
            this.assert.strictEqual(playerSkinApplier.removeSkin(setup.playerSchema, setup.items.warlockRobe), false);
            this.assert.strictEqual(playerSkinApplier.removeSkin(setup.playerSchema, setup.items.potion), false);
            this.assert.strictEqual(setup.playerSchema.avatarKey, 'mage');
        });
    }

    async testUnequipWithoutClassPathRestoresTheDefaultImage()
    {
        await this.test('unequipping the skin of a player without class path restores the default image', async () => {
            let setup = this.createSetup([]);
            setup.playerSchema.avatarKey = 'warlock';
            setup.playerSchema.skillsServer = false;
            let removed = new PlayerSkinApplier().removeSkin(setup.playerSchema, setup.items.warlockRobe);
            this.assert.strictEqual(removed, true);
            this.assert.strictEqual(setup.playerSchema.avatarKey, GameConst.IMAGE_PLAYER);
        });
    }

}

module.exports.TestPlayerSkinApplier = TestPlayerSkinApplier;
