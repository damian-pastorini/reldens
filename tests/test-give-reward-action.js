/**
 *
 * Reldens - Test Give Reward Action
 *
 * Tests GiveRewardAction with a recording items manager (addItem answers the added item or false like the items system
 * Inventory, removeItem answers its given result): a single created instance (a single instance item or a quantity of
 * 1) is added with addItem and its result is returned, an item instance that could not be created adds nothing and
 * answers false. The list of units created for a quantity of an item that is not single instance is added unit by unit
 * with addItem and answers true (ISSUE #477); a unit that fails removes every unit already added (by its inventory id)
 * and answers false, a first unit that fails removes nothing, and an added unit that could not be removed is logged
 * while the other added units are still removed.
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
        playerSchema.inventory = {manager: {
            createItemInstance: (itemKey, itemQuantity) => {
                playerSchema.calls.push(['create', itemKey, itemQuantity]);
                return createdItems;
            },
            addItem: async (item) => {
                playerSchema.calls.push(['addItem', sc.get(item, 'uid', item.key)]);
                return addResults.shift() ? item : false;
            },
            removeItem: async (itemId) => {
                playerSchema.calls.push(['removeItem', itemId]);
                return false !== removeResults[itemId];
            }
        }};
        return playerSchema;
    }

    async executeRecordingErrors(playerSchema, itemQuantity)
    {
        let loggerError = Logger.error;
        let loggedErrors = [];
        Logger.error = (...logArguments) => loggedErrors.push(logArguments);
        let executeResult = await this.giveRewardAction.execute(playerSchema, 'branch', itemQuantity);
        Logger.error = loggerError;
        return [executeResult, playerSchema.calls, loggedErrors];
    }

    async testASingleCreatedInstanceIsAddedWithAddItem()
    {
        await this.test('a single created instance is added with addItem and its result returned, an instance not created adds nothing', async () => {
            let singleItem = {key: 'coins', qty: 5};
            this.assert.deepStrictEqual(
                [
                    await this.executeRecordingErrors(this.createPlayerSchema(singleItem, [true]), 5),
                    await this.executeRecordingErrors(this.createPlayerSchema(singleItem, [false]), 5),
                    await this.executeRecordingErrors(this.createPlayerSchema(false, [true]), 1)
                ],
                [
                    [singleItem, [['create', 'branch', 5], ['addItem', 'coins']], []],
                    [false, [['create', 'branch', 5], ['addItem', 'coins']], []],
                    [false, [['create', 'branch', 1]], [['Reward item instance could not be created.', 'branch']]]
                ]
            );
        });
    }

    async testACreatedListAddsEveryUnitAndAnswersTrue()
    {
        await this.test('a created list adds every unit with addItem and answers true, removing nothing', async () => {
            this.assert.deepStrictEqual(
                await this.executeRecordingErrors(this.createPlayerSchema(this.itemsUnits, [true, true, true]), 3),
                [true, [['create', 'branch', 3], ['addItem', 'unit-1'], ['addItem', 'unit-2'], ['addItem', 'unit-3']], []]
            );
        });
    }

    async testAFailedUnitRemovesTheUnitsAlreadyAdded()
    {
        await this.test('a created list whose second unit fails removes the first unit and answers false, a failed first unit removes nothing', async () => {
            let addFailedError = ['Reward item unit could not be added, the added units are removed.', 'branch'];
            this.assert.deepStrictEqual(
                [
                    await this.executeRecordingErrors(this.createPlayerSchema(this.itemsUnits, [true, false]), 3),
                    await this.executeRecordingErrors(this.createPlayerSchema(this.itemsUnits, [false]), 3)
                ],
                [
                    [
                        false,
                        [['create', 'branch', 3], ['addItem', 'unit-1'], ['addItem', 'unit-2'], ['removeItem', 'unit-1']],
                        [addFailedError]
                    ],
                    [false, [['create', 'branch', 3], ['addItem', 'unit-1']], [addFailedError]]
                ]
            );
        });
    }

    async testAnAddedUnitThatCannotBeRemovedIsLogged()
    {
        await this.test('an added unit that cannot be removed is logged and the other added units are still removed', async () => {
            let playerSchema = this.createPlayerSchema(this.itemsUnits, [true, true, false], {'unit-1': false});
            this.assert.deepStrictEqual(
                [
                    await this.executeRecordingErrors(playerSchema, 3),
                    await this.giveRewardAction.removeAddedItems(
                        this.createPlayerSchema([], [], {'unit-2': false}).inventory.manager,
                        ['unit-1', 'unit-2']
                    ),
                    await this.giveRewardAction.removeAddedItems(
                        this.createPlayerSchema([], []).inventory.manager,
                        ['unit-1', 'unit-2']
                    )
                ],
                [
                    [
                        false,
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
                            ['Added reward item unit could not be removed.', 'unit-1']
                        ]
                    ],
                    false,
                    true
                ]
            );
        });
    }

}

module.exports.TestGiveRewardAction = TestGiveRewardAction;
