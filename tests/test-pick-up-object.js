/**
 *
 * Reldens - Test Pick Up Object
 *
 * Tests the drop pick up: overlapping pick ups give the item once, a locked inventory, a missing or failed item load
 * and an object with no item keep the drop, and a drop hit with the teams feature disabled (ISSUE #300) is picked up by
 * the player that hit it.
 *
 */

const { BaseTest } = require('./base-test');
const { PickUpObject } = require('../lib/rewards/server/pick-up-object');
const { DropObject } = require('../lib/objects/server/object/type/drop-object');
const timersPromises = require('timers/promises');

class TestPickUpObject extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.itemModel = {id: 3, key: 'branch'};
    }

    createPickUpSetup(options = {})
    {
        let setup = {addedItems: [], removedObjects: [], options};
        setup.dropObject = {id: 'drop-1', itemId: this.itemModel.id, isPickedUp: false};
        setup.room = {
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {getEntity: () => ({loadById: async () => await this.loadItemModel(setup)})},
            removeObject: (roomObject) => setup.removedObjects.push(roomObject.id)
        };
        setup.playerSchema = {
            player_id: 7,
            inventory: {
                manager: {
                    createItemInstance: (itemKey) => ({itemKey}),
                    addItem: async (itemInstance) => this.addItem(setup, itemInstance)
                }
            }
        };
        return setup;
    }

    async loadItemModel(setup)
    {
        await timersPromises.setImmediate();
        if(setup.options.loadRejects){
            return Promise.reject({message: 'Storage.'});
        }
        return setup.options.missingItem ? null : this.itemModel;
    }

    addItem(setup, itemInstance)
    {
        if(setup.options.lockedInventory){
            return false;
        }
        setup.addedItems.push(itemInstance.itemKey);
        return itemInstance;
    }

    async pickUp(setup)
    {
        return await PickUpObject.execute(setup.dropObject, setup.room, setup.playerSchema, false);
    }

    async testOverlappingPickUpsGiveTheItemOnce()
    {
        await this.test('two pick ups of the same drop at the same time give its item once and remove it once', async () => {
            let setup = this.createPickUpSetup();
            let results = await Promise.all([this.pickUp(setup), this.pickUp(setup)]);
            this.assert.deepStrictEqual(results, [true, false]);
            this.assert.deepStrictEqual(setup.addedItems, [this.itemModel.key]);
            this.assert.deepStrictEqual(setup.removedObjects, [setup.dropObject.id]);
        });
    }

    async testLockedInventoryKeepsTheDrop()
    {
        await this.test('a pick up refused by a locked inventory keeps the drop for a later pick up', async () => {
            let setup = this.createPickUpSetup({lockedInventory: true});
            this.assert.strictEqual(await this.pickUp(setup), false);
            this.assert.deepStrictEqual(setup.removedObjects, []);
            this.assert.strictEqual(setup.dropObject.isPickedUp, false);
            setup.options.lockedInventory = false;
            this.assert.strictEqual(await this.pickUp(setup), true);
            this.assert.deepStrictEqual(setup.addedItems, [this.itemModel.key]);
            this.assert.deepStrictEqual(setup.removedObjects, [setup.dropObject.id]);
        });
    }

    async testMissingOrFailedItemLoadKeepsTheDrop()
    {
        await this.test('a missing item or a failed item load keeps the drop and adds nothing', async () => {
            for(let options of [{missingItem: true}, {loadRejects: true}]){
                let setup = this.createPickUpSetup(options);
                this.assert.strictEqual(await this.pickUp(setup), false);
                this.assert.deepStrictEqual(setup.addedItems, []);
                this.assert.deepStrictEqual(setup.removedObjects, []);
                this.assert.strictEqual(setup.dropObject.isPickedUp, false);
            }
        });
    }

    async testADropHitWithTheTeamsFeatureDisabledIsPickedUp()
    {
        await this.test('a drop hit with the teams feature disabled is picked up by the player that hit it', async () => {
            let setup = this.createPickUpSetup();
            let dropObject = new DropObject({
                events: {},
                config: {get: () => 32, getWithoutLogs: setup.room.config.getWithoutLogs},
                dataServer: {},
                client_key: this.itemModel.key,
                id: setup.dropObject.id
            });
            dropObject.itemId = this.itemModel.id;
            dropObject.autoPickUpOnHit = true;
            setup.playerSchema.currentTeam = 35;
            setup.room.featuresManager = {featuresList: {rewards: {package: {}}}};
            setup.room.playerBySessionIdFromState = (sessionId) => 'session-7' === sessionId ? setup.playerSchema : false;
            let pickUpResult = await dropObject.onHit({bodyA: {playerId: 'session-7'}, bodyB: {}, room: setup.room});
            this.assert.deepStrictEqual(
                [pickUpResult, setup.addedItems, setup.removedObjects],
                [true, [this.itemModel.key], [setup.dropObject.id]]
            );
        });
    }

    async testObjectWithoutItemIsNotPickedUp()
    {
        await this.test('an object with no item ID is not picked up and is not marked', async () => {
            let setup = this.createPickUpSetup();
            setup.dropObject = {id: 'npc-1'};
            this.assert.strictEqual(await this.pickUp(setup), false);
            this.assert.deepStrictEqual(setup.removedObjects, []);
            this.assert.strictEqual(setup.dropObject.isPickedUp, undefined);
        });
    }

}

module.exports.TestPickUpObject = TestPickUpObject;
