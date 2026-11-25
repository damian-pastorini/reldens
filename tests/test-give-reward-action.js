/**
 *
 * Reldens - Test Give Reward Action
 *
 * Tests GiveRewardAction with a recording items manager (addItem keeps the added unit in its items and answers it, or
 * answers false like the items system Inventory, removeItem drops it or answers its given failure); every give answers
 * the units the player keeps: a single created instance (a single instance item or a quantity of 1) is added with
 * addItem and answers its quantity, an item instance that could not be created or was refused answers 0. The list of
 * units created for a quantity of an item that is not single instance is added unit by unit with addItem and answers
 * the units count (ISSUE #477); a unit that fails removes every unit still in the items (by its inventory id) and
 * answers 0 so the reward can be given again, a first unit that fails removes nothing, and an added unit that could
 * not be removed is logged as critical with the units left while the other units are still removed, and the units
 * left are answered as kept.
 *
 */

const { BaseTest } = require('./base-test');
const { GiveRewardAction } = require('../lib/rewards/server/actions/give-reward-action');
const { Logger, sc } = require('@reldens/utils');

class TestGiveRewardAction extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.giveRewardAction = new GiveRewardAction();
        this.itemsUnits = ['unit-1', 'unit-2', 'unit-3'].map((uid) => ({key: 'branch', uid, getInventoryId: () => uid}));
    }

    createPlayerSchema(createdItems, addResults, removeResults = {})
    {
        let playerSchema = {calls: []};
        let itemsManager = {items: {}};
        itemsManager.createItemInstance = (itemKey, itemQuantity) => {
            playerSchema.calls.push(['create', itemKey, itemQuantity]);
            return createdItems;
        };
        itemsManager.addItem = async (item) => {
            let itemId = sc.get(item, 'uid', item.key);
            playerSchema.calls.push(['addItem', itemId]);
            if(!addResults.shift()){
                return false;
            }
            itemsManager.items[itemId] = item;
            return item;
        };
        itemsManager.removeItem = async (itemId) => {
            playerSchema.calls.push(['removeItem', itemId]);
            if(false === removeResults[itemId]){
                return false;
            }
            delete itemsManager.items[itemId];
            return true;
        };
        playerSchema.inventory = {manager: itemsManager};
        return playerSchema;
    }

    async executeRecordingErrors(playerSchema, itemQuantity)
    {
        let loggerError = Logger.error;
        let loggerCritical = Logger.critical;
        let loggedErrors = [];
        Logger.error = (...logArguments) => loggedErrors.push(logArguments);
        Logger.critical = (...logArguments) => loggedErrors.push(logArguments);
        let executeResult = await this.giveRewardAction.execute(playerSchema, 'branch', itemQuantity);
        Logger.error = loggerError;
        Logger.critical = loggerCritical;
        return [executeResult, playerSchema.calls, loggedErrors];
    }

    async testASingleCreatedInstanceIsAddedWithAddItem()
    {
        await this.test('a single created instance is added with addItem and answers its quantity, an instance not created or refused answers 0', async () => {
            let singleItem = {key: 'coins', qty: 5};
            this.assert.deepStrictEqual(
                [
                    await this.executeRecordingErrors(this.createPlayerSchema(singleItem, [true]), 5),
                    await this.executeRecordingErrors(this.createPlayerSchema(singleItem, [false]), 5),
                    await this.executeRecordingErrors(this.createPlayerSchema(false, [true]), 1)
                ],
                [
                    [singleItem.qty, [['create', 'branch', 5], ['addItem', 'coins']], []],
                    [0, [['create', 'branch', 5], ['addItem', 'coins']], []],
                    [0, [['create', 'branch', 1]], [['Reward item instance could not be created.', 'branch']]]
                ]
            );
        });
    }

    async testACreatedListAddsEveryUnitAndAnswersTrue()
    {
        await this.test('a created list adds every unit with addItem and answers the units count, removing nothing', async () => {
            this.assert.deepStrictEqual(
                await this.executeRecordingErrors(this.createPlayerSchema(this.itemsUnits, [true, true, true]), 3),
                [
                    this.itemsUnits.length,
                    [['create', 'branch', 3], ['addItem', 'unit-1'], ['addItem', 'unit-2'], ['addItem', 'unit-3']],
                    []
                ]
            );
        });
    }

    async testAFailedUnitRemovesTheUnitsAlreadyAdded()
    {
        await this.test('a created list whose second unit fails removes the first unit and answers 0 kept units, a failed first unit removes nothing', async () => {
            let addFailedError = ['Reward item unit could not be added, the added units are removed.', 'branch'];
            this.assert.deepStrictEqual(
                [
                    await this.executeRecordingErrors(this.createPlayerSchema(this.itemsUnits, [true, false]), 3),
                    await this.executeRecordingErrors(this.createPlayerSchema(this.itemsUnits, [false]), 3)
                ],
                [
                    [
                        0,
                        [['create', 'branch', 3], ['addItem', 'unit-1'], ['addItem', 'unit-2'], ['removeItem', 'unit-1']],
                        [addFailedError]
                    ],
                    [0, [['create', 'branch', 3], ['addItem', 'unit-1']], [addFailedError]]
                ]
            );
        });
    }

    async testAnAddedUnitThatCannotBeRemovedIsLogged()
    {
        await this.test('an added unit that cannot be removed is logged as critical, the other units are still removed and the kept units count is answered', async () => {
            let playerSchema = this.createPlayerSchema(this.itemsUnits, [true, true, false], {'unit-1': false});
            let unremovableManager = this.createPlayerSchema([], [], {'unit-2': false}).inventory.manager;
            unremovableManager.items = {'unit-1': this.itemsUnits[0], 'unit-2': this.itemsUnits[1]};
            let removableManager = this.createPlayerSchema([], []).inventory.manager;
            removableManager.items = {'unit-1': this.itemsUnits[0], 'unit-2': this.itemsUnits[1]};
            this.assert.deepStrictEqual(
                [
                    await this.executeRecordingErrors(playerSchema, 3),
                    await this.giveRewardAction.removeAddedItems(unremovableManager, this.itemsUnits, 'branch'),
                    await this.giveRewardAction.removeAddedItems(removableManager, this.itemsUnits, 'branch')
                ],
                [
                    [
                        1,
                        [
                            ['create', 'branch', 3],
                            ['addItem', 'unit-1'],
                            ['addItem', 'unit-2'],
                            ['addItem', 'unit-3'],
                            ['removeItem', 'unit-1'],
                            ['removeItem', 'unit-2']
                        ],
                        [
                            ['Reward item unit could not be added, the added units are removed.', 'branch'],
                            ['Reward item units could not be removed, the units left count as given.', 'branch', 1]
                        ]
                    ],
                    1,
                    0
                ]
            );
        });
    }

}

module.exports.TestGiveRewardAction = TestGiveRewardAction;
