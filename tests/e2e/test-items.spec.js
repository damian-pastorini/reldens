/**
 *
 * Reldens - Test Items
 *
 * Tests inventory panel, equip/unequip, equipment panel, and consumable use.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItems
{
    static async loginRootPlayer(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
    }

    static async loginAndOpenEquipButton(page, gameConfig, longRun)
    {
        let itemId = gameConfig.e2eEquipableItemId || '';
        expect(itemId, 'e2eEquipableItemId must be configured').toBeTruthy();
        await TestItems.loginRootPlayer(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        await page.click(Selectors.hud.playerStatsOpen);
        await page.waitForTimeout(pauseMs);
        let statBefore = await page.locator(Selectors.stats.firstValue).first().textContent();
        await page.click(Selectors.hud.inventoryOpen);
        await page.waitForTimeout(pauseMs);
        await page.click(Selectors.inventory.itemImage(itemId));
        await page.waitForTimeout(pauseMs);
        let equipButton = page.locator(Selectors.inventory.itemEquip(itemId));
        await expect(equipButton).toBeVisible();
        return { itemId, pauseMs, statBefore, equipButton };
    }

    static async runUnequipTest(page, screenshots, gameConfig, longRun)
    {
        let setup = await TestItems.loginAndOpenEquipButton(page, gameConfig, longRun);
        await setup.equipButton.click();
        await page.waitForTimeout(1000 + setup.pauseMs);
        let statEquipped = await page.locator(Selectors.stats.firstValue).first().textContent();
        expect(statEquipped, 'Stat must change after equipping item').not.toBe(setup.statBefore);
        await screenshots.capture(page, 'item-equipped');
        await page.click(Selectors.inventory.itemImage(setup.itemId));
        await page.waitForTimeout(setup.pauseMs);
        await setup.equipButton.click();
        await page.waitForTimeout(1000 + setup.pauseMs);
        let statAfter = await page.locator(Selectors.stats.firstValue).first().textContent();
        expect(statAfter, 'Stat must revert after unequipping item').toBe(setup.statBefore);
        await screenshots.capture(page, 'stat-reverted-after-unequip');
    }

    static async runEquippedSlotTest(page, screenshots, gameConfig, longRun)
    {
        let setup = await TestItems.loginAndOpenEquipButton(page, gameConfig, longRun);
        await setup.equipButton.click();
        await page.waitForTimeout(1000 + setup.pauseMs);
        await screenshots.capture(page, 'item-equipped-before-slot-click');
        await page.click(Selectors.hud.equipmentOpen);
        await page.waitForTimeout(setup.pauseMs);
        await expect(page.locator(Selectors.equipment.ui)).toBeVisible();
        let slotImages = page.locator(Selectors.equipment.slotImage);
        let slotCount = await slotImages.count();
        expect(slotCount, 'Equipment panel must contain at least one equipped slot image after equipping').toBeGreaterThan(0);
        await screenshots.capture(page, 'equipment-panel-with-equipped-slot');
        await slotImages.first().click();
        await page.waitForTimeout(1000 + setup.pauseMs);
        await expect(page.locator(Selectors.equipment.itemBoxVisible).first()).toBeVisible({ timeout: 10000 });
        await screenshots.capture(page, 'equipped-slot-item-box-visible');
    }

    static async runConsumableTest(page, screenshots, gameConfig, longRun)
    {
        let itemId = gameConfig.e2eConsumableItemId || '';
        expect(itemId, 'e2eConsumableItemId must be configured').toBeTruthy();
        await TestItems.loginRootPlayer(page, gameConfig, longRun);
        let pauseMs = longRun ? 800 : 0;
        await page.click(Selectors.hud.inventoryOpen);
        await page.waitForTimeout(pauseMs);
        let qtyBefore = await page.locator(Selectors.inventory.itemQty(itemId)).textContent();
        await screenshots.capture(page, 'consumable-quantity-before');
        await page.click(Selectors.inventory.itemImage(itemId));
        await page.waitForTimeout(pauseMs);
        let useButton = page.locator(Selectors.inventory.itemUse(itemId));
        await expect(useButton).toBeVisible();
        await page.waitForTimeout(pauseMs);
        await useButton.click();
        await page.waitForTimeout(1000 + pauseMs);
        let qtyAfter = await page.locator(Selectors.inventory.itemQty(itemId)).textContent();
        expect(qtyAfter).not.toBe(qtyBefore);
        await screenshots.capture(page, 'consumable-quantity-after');
    }

    static run()
    {
        test.describe('Items System', () => {

            test('inventory panel opens and shows items', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestItems.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
                await page.click(Selectors.hud.inventoryOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
                await expect(page.locator(Selectors.inventory.items)).toBeVisible();
                await screenshots.capture(page, 'inventory-panel-open');
            });

            test('equip item changes stat value', async ({ page, screenshots, gameConfig, longRun }) => {
                let setup = await TestItems.loginAndOpenEquipButton(page, gameConfig, longRun);
                await screenshots.capture(page, 'equip-button-visible');
                await page.waitForTimeout(setup.pauseMs);
                await setup.equipButton.click();
                await page.waitForTimeout(1000 + setup.pauseMs);
                let statAfter = await page.locator(Selectors.stats.firstValue).first().textContent();
                expect(statAfter).not.toBe(setup.statBefore);
                await screenshots.capture(page, 'stat-changed-after-equip');
            });

            test('equipment panel opens and shows equipment slots', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestItems.loginRootPlayer(page, gameConfig, longRun);
                let pauseMs = longRun ? 800 : 0;
                await page.click(Selectors.hud.equipmentOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.equipment.ui)).toBeVisible();
                await expect(page.locator(Selectors.equipment.items)).toBeVisible();
                await screenshots.capture(page, 'equipment-panel-open');
            });

            test('unequip item reverts stat value to original', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestItems.runUnequipTest(page, screenshots, gameConfig, longRun);
            });

            test('clicking equipped slot in equipment panel shows item details', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestItems.runEquippedSlotTest(page, screenshots, gameConfig, longRun);
            });

            test('use consumable item decreases quantity', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestItems.runConsumableTest(page, screenshots, gameConfig, longRun);
            });

        });
    }
}

TestItems.run();
