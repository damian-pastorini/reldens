/**
 *
 * Reldens - Test Items Display
 *
 * Tests the inventory and equipment panels of a client (TradeSteps: the inventory rows of the group players preserved,
 * the extra items seeded and the live items read from the server; ItemsSteps: the configured equipable item equipped):
 * the trash icon asks for a confirmation, the cancel keeps the item and the confirm removes its box and its row; the
 * item details open one at a time (the open details popup covers the next box, so its image click is dispatched) and a
 * second click on the same image hides them; the equip button of the equipment
 * panel returns the box to the inventory panel and empties the group slot; a base item shows only the trash action;
 * the modifiers show the sign of their operation (the stored rows seeded for the group); an item that does not grow
 * shows no level and an item with no modifiers an empty modifiers block; a player with no items gets the first added
 * item live; and the equipment slots follow the stored group sort.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { TeamSteps } = require('./helpers/team-steps');
const { ItemsSteps } = require('./helpers/items-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
const { SecurityApi } = require('./helpers/security-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ModifierConst } = require('@reldens/modifiers');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemsDisplay
{

    static BRANCH = 'branch';
    static SPEAR = 'spear';
    static DETAILS_VISIBLE = /item-data-visible/;
    static TRASH_VISIBLE = /trash-confirm-visible/;
    static SEEDED_MODIFIER_VALUE = '2';
    static SEEDED_MODIFIER_PROPERTY = 'stats/def';
    static OPERATION_SIGNS = {
        [ModifierConst.OPS.INC_P]: ['+', '%'],
        [ModifierConst.OPS.DEC]: ['-', ''],
        [ModifierConst.OPS.DEC_P]: ['-', '%'],
        [ModifierConst.OPS.MUL]: ['*', ''],
        [ModifierConst.OPS.DIV]: ['/', ''],
        [ModifierConst.OPS.SET]: ['=', '']
    };

    static async enter(context, seededItems = [])
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        let [player] = await TradeSteps.enterPlayers(context, 1, seededItems);
        await ItemsSteps.openInventory(player.page);
        return player;
    }

    static async runTrashConfirmTest(context)
    {
        let player = await TestItemsDisplay.enter(context, [{playerIndex: 0, itemKey: TestItemsDisplay.BRANCH, qty: 1}]);
        let page = player.page;
        let branchId = await TradeSteps.fetchItemId(context, player, TestItemsDisplay.BRANCH);
        let trashConfirm = page.locator('#trash-confirm-'+branchId);
        await page.click(Selectors.inventory.boxImage(branchId));
        await page.click('#item-trash-'+branchId+' img');
        await expect(trashConfirm, 'The trash asks for a confirmation').toHaveClass(TestItemsDisplay.TRASH_VISIBLE);
        await page.click('#trash-cancel-'+branchId);
        await expect(trashConfirm, 'The cancel hides the confirmation').not.toHaveClass(TestItemsDisplay.TRASH_VISIBLE);
        await page.waitForTimeout(TradeSteps.SETTLE_MS);
        await TradeSteps.expectStoredQuantity(context, player, TestItemsDisplay.BRANCH, 1, 'The cancel keeps the item');
        await page.click('#item-trash-'+branchId+' img');
        await page.click('#trash-confirmed-'+branchId);
        await expect(page.locator('#item-'+branchId), 'The confirm removes the box').toHaveCount(0);
        await TradeSteps.expectStoredQuantity(context, player, TestItemsDisplay.BRANCH, 0, 'The confirm removes the row');
    }

    static async runDetailsToggleTest(context)
    {
        let player = await TestItemsDisplay.enter(context);
        let page = player.page;
        let axeId = await TradeSteps.fetchItemId(context, player, context.gameConfig.e2eEquipableItemId);
        let potionId = await TradeSteps.fetchItemId(context, player, context.gameConfig.e2eConsumableItemId);
        await page.click(Selectors.inventory.boxImage(axeId));
        await expect(page.locator(Selectors.inventory.boxDetails(axeId)), 'The axe details open').toHaveClass(TestItemsDisplay.DETAILS_VISIBLE);
        await page.locator(Selectors.inventory.boxImage(potionId)).dispatchEvent('click');
        await expect(page.locator(Selectors.inventory.boxDetails(axeId)), 'Another item closes the axe details')
            .not.toHaveClass(TestItemsDisplay.DETAILS_VISIBLE);
        await expect(page.locator(Selectors.inventory.boxDetails(potionId)), 'The potion details open')
            .toHaveClass(TestItemsDisplay.DETAILS_VISIBLE);
        await page.click(Selectors.inventory.boxImage(potionId));
        await expect(page.locator(Selectors.inventory.boxDetails(potionId)), 'A second click hides the potion details')
            .not.toHaveClass(TestItemsDisplay.DETAILS_VISIBLE);
    }

    static async runEquipmentButtonTest(context)
    {
        let player = await TestItemsDisplay.enter(context);
        let page = player.page;
        let axeGroupKey = await ItemsSteps.fetchGroupKey(context.gameConfig, context.gameConfig.e2eEquipableItemId);
        let axeId = await ItemsSteps.equipAxe(context, player);
        await page.click(Selectors.hud.inventoryClose);
        await page.click(Selectors.hud.equipmentOpen);
        await expect(page.locator(Selectors.equipment.ui), 'The equipment panel opens').toBeVisible();
        let groupSlot = Selectors.equipment.slotById(axeGroupKey)+' .equipped-item';
        await expect(page.locator(groupSlot+' #item-'+axeId), 'The axe is in its group slot').toHaveCount(1);
        await page.click(groupSlot+' '+Selectors.inventory.boxImage(axeId));
        await page.click('#item-equip-'+axeId);
        await ItemsSteps.expectEquipped(context, player, axeId, false, 'The equipment button unequips the axe');
        await expect(page.locator(Selectors.inventory.items+' #item-'+axeId), 'The box returns to the inventory panel').toHaveCount(1);
        await expect(page.locator(groupSlot+' .item-box'), 'The group slot empties').toHaveCount(0);
    }

    static async runBaseItemActionsTest(context)
    {
        let player = await TestItemsDisplay.enter(context, [{playerIndex: 0, itemKey: TestItemsDisplay.BRANCH, qty: 1}]);
        let branchId = await TradeSteps.fetchItemId(context, player, TestItemsDisplay.BRANCH);
        expect(
            await Promise.all(['#item-use-', '#item-equip-', '#item-trash-'].map(
                actionPrefix => player.page.locator(actionPrefix+branchId).count()
            )),
            'Only the trash action'
        ).toEqual([0, 0, 1]);
    }

    static async runModifiersSignsTest(context)
    {
        let gameConfig = context.gameConfig;
        let spearItemId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'itemsItem', {key: TestItemsDisplay.SPEAR});
        for(let operation of [ModifierConst.OPS.DEC, ModifierConst.OPS.DEC_P, ModifierConst.OPS.MUL, ModifierConst.OPS.DIV, ModifierConst.OPS.SET]){
            await E2eSeedAndRestoreApi.createRow(gameConfig, context.e2eGroup, 'itemsItemModifiers', {
                item_id: spearItemId,
                key: TestItemsDisplay.SEEDED_MODIFIER_PROPERTY.split('/').pop(),
                property_key: TestItemsDisplay.SEEDED_MODIFIER_PROPERTY,
                operation,
                value: TestItemsDisplay.SEEDED_MODIFIER_VALUE,
                maxProperty: null
            });
        }
        let modifiers = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItemModifiers', {item_id: spearItemId})].sort(
            (modifierA, modifierB) => modifierA.id - modifierB.id
        );
        let player = await TestItemsDisplay.enter(context, [{playerIndex: 0, itemKey: TestItemsDisplay.SPEAR, qty: 1}]);
        let spearId = await TradeSteps.fetchItemId(context, player, TestItemsDisplay.SPEAR);
        expect(
            await player.page.locator('#item-'+spearId+' .item-modifier').allTextContents(),
            'Each modifier shows the sign of its operation'
        ).toEqual(modifiers.map(modifier => {
            let [prefix, suffix] = TestItemsDisplay.OPERATION_SIGNS[modifier.operation];
            return prefix+Number(modifier.value)+suffix+' '+modifier.property_key.split('/').pop();
        }));
    }

    static async runEmptyDetailsTest(context)
    {
        let player = await TestItemsDisplay.enter(context, [{playerIndex: 0, itemKey: TestItemsDisplay.BRANCH, qty: 1}]);
        let axeId = await TradeSteps.fetchItemId(context, player, context.gameConfig.e2eEquipableItemId);
        let branchId = await TradeSteps.fetchItemId(context, player, TestItemsDisplay.BRANCH);
        await expect(player.page.locator('#item-'+axeId+' .item-level'), 'The axe shows no level').toHaveCount(0);
        await expect(player.page.locator('#item-'+branchId+' .item-modifiers'), 'The branch has a modifiers block').toHaveCount(1);
        await expect(player.page.locator('#item-'+branchId+' .item-modifiers .item-modifier'), 'The block is empty').toHaveCount(0);
    }

    static async runNoItemsTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        let gameConfig = context.gameConfig;
        let [playerName, holderName] = [TeamSteps.USER_SUFFIXES[0], TeamSteps.USER_SUFFIXES[2]].map(
            suffix => gameConfig['e2ePlayerName'+suffix]
        );
        let holderFilter = {owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: holderName})};
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'itemsInventory', holderFilter);
        await E2eSeedAndRestoreApi.updateWithPreserve(
            gameConfig,
            context.e2eGroup,
            'itemsInventory',
            {owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName})},
            holderFilter
        );
        let [player] = await TeamSteps.enterPlayers(context, 1);
        await ItemsSteps.openInventory(player.page);
        await expect(player.page.locator(Selectors.inventory.items+' .item-box'), 'The inventory is empty').toHaveCount(0);
        let added = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/inventory/add-item', {
            roomName: ParallelSpecGroups.fetchGroup(context.e2eGroup).startRoomName,
            playerName,
            itemKey: TestItemsDisplay.BRANCH
        });
        expect(added.inventoryId, 'The branch is added').toBeTruthy();
        await expect(player.page.locator(Selectors.inventory.itemImage(TestItemsDisplay.BRANCH)), 'The first item appears live')
            .toHaveCount(1);
    }

    static async runGroupsSortTest(context)
    {
        let player = await TestItemsDisplay.enter(context);
        let groups = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'itemsGroup', {})].sort(
            (groupA, groupB) => groupA.sort - groupB.sort
        );
        expect(
            await player.page.locator(Selectors.equipment.items+' '+Selectors.equipment.groupSlot).evaluateAll(
                slots => slots.map(slot => slot.dataset.groupId)
            ),
            'The slots follow the group sort'
        ).toEqual(groups.map(group => group.key));
    }

    static run()
    {
        test.describe('Items Display', () => {
            test('trash asks for a confirmation, cancel keeps the item and confirm removes it', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runTrashConfirmTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item details open one at a time and a second click hides them', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runDetailsToggleTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipment panel equip button returns the item to the inventory panel', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runEquipmentButtonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('base item shows only the trash action', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runBaseItemActionsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('modifiers show the sign of their operation', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runModifiersSignsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item that does not grow shows no level and one with no modifiers an empty block', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runEmptyDetailsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player with no items gets the first added item live', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runNoItemsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('equipment slots follow the group sort', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemsDisplay.runGroupsSortTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemsDisplay.run();
