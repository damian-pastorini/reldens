/**
 *
 * Reldens - Test Ad Skins
 *
 * Tests the ad items that give a skin: with the skin ad enabled for the group and a skin ticket seeded in the player
 * inventory, using the ticket from the inventory panel keeps it (the use only asks the client to play the skin ad),
 * the played ad consumes the ticket and rewards the skin item, and equipping the skin item changes the player avatar on
 * the server and on the client sprite until it is unequipped. A failed skin ad is closed without consuming the ticket
 * nor giving the skin item. The keys come from the stored config and item rows.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { UsersConst } = require('../../lib/users/constants');
const { AdsConst } = require('../../lib/ads/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdSkins
{

    static async loadSkinData(gameConfig)
    {
        let adsKey = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, UsersConst.SKINS.CONFIG_PATHS.ADS_KEY);
        let adVideoRow = [...await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'adsEventVideo',
            {ads_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'ads', {key: adsKey})}
        )].shift();
        let rewardItemKey = sc.toJson(adVideoRow.event_data, {}).rewardItemKey;
        return {
            adsKey,
            ticketItemKey: await E2eSeedAndRestoreApi.fetchConfigValue(
                gameConfig,
                UsersConst.SKINS.CONFIG_PATHS.AD_TICKET_ITEM_KEY
            ),
            rewardItemKey,
            skinKey: sc.toJson(
                [...await E2eSeedAndRestoreApi.loadRows(
                    gameConfig,
                    'itemsItem',
                    {key: rewardItemKey}
                )].shift().customData,
                {}
            ).skinKey
        };
    }

    static async fetchAvatarKeys(page, gameConfig, roomName)
    {
        return {
            server: (await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName)).avatarKey,
            client: await page.evaluate(
                () => window.reldens.getActiveScene().player.players[window.reldens.activeRoomEvents.room.sessionId]
                    .avatarKey
            )
        };
    }

    static async fetchItemQuantities(gameConfig, playerName, itemKey)
    {
        return (await E2eSeedAndRestoreApi.loadInventoryRows(gameConfig, playerName, itemKey)).map(
            row => Number(row.qty)
        );
    }

    static async fetchPlayedAd(gameConfig, playerName, adId)
    {
        return [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            ads_id: adId
        })].shift();
    }

    static async clickItemButton(page, imageSelector, buttonSelector, longRun)
    {
        await page.locator(imageSelector).click({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        let itemButton = page.locator(buttonSelector);
        await expect(itemButton).toBeVisible();
        await itemButton.click();
    }

    static async runAdSkinTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let skinData = await TestAdSkins.loadSkinData(gameConfig);
        expect(skinData.skinKey, 'The skin ad reward item must have a skin key').toBeTruthy();
        let playerName = gameConfig.e2ePlayerName;
        let skinAd = await AdMessagesPlayer.enableAd(gameConfig, e2eGroup, skinData.adsKey, playerName);
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, e2eGroup, playerName, skinData.ticketItemKey, 1);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let roomName = await Navigation.getCurrentRoomName(page);
        let avatarsBefore = await TestAdSkins.fetchAvatarKeys(page, gameConfig, roomName);
        expect(avatarsBefore.client, 'The client sprite must show the server avatar').toBe(avatarsBefore.server);
        await page.click(Selectors.hud.inventoryOpen);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
        await TestAdSkins.clickItemButton(
            page,
            Selectors.inventory.itemImage(skinData.ticketItemKey),
            Selectors.inventory.itemUse(skinData.ticketItemKey),
            longRun
        );
        await screenshots.capture(page, 'skin-ticket-used');
        expect(
            await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.ticketItemKey),
            'The ticket use only requests the skin ad'
        ).toEqual([1]);
        await AdMessagesPlayer.playAd(page, skinAd);
        await expect(page.locator(Selectors.inventory.itemImage(skinData.rewardItemKey))).toBeVisible({
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await expect.poll(
            async () => (await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.ticketItemKey)).filter(
                qty => 0 < qty
            ),
            {message: 'The rewarded skin ad must consume the ticket'}
        ).toEqual([]);
        await screenshots.capture(page, 'skin-item-rewarded');
        await TestAdSkins.clickItemButton(
            page,
            Selectors.inventory.itemImage(skinData.rewardItemKey),
            Selectors.inventory.itemEquip(skinData.rewardItemKey),
            longRun
        );
        await expect.poll(
            async () => await TestAdSkins.fetchAvatarKeys(page, gameConfig, roomName),
            {message: 'The equipped skin must change the server and client avatar'}
        ).toEqual({server: skinData.skinKey, client: skinData.skinKey});
        await screenshots.capture(page, 'skin-equipped');
        await page.click(Selectors.hud.equipmentOpen);
        await expect(page.locator(Selectors.equipment.ui)).toBeVisible();
        await TestAdSkins.clickItemButton(
            page,
            Selectors.equipment.itemImage(skinData.rewardItemKey),
            Selectors.equipment.itemEquip(skinData.rewardItemKey),
            longRun
        );
        await expect.poll(
            async () => await TestAdSkins.fetchAvatarKeys(page, gameConfig, roomName),
            {message: 'The unequipped skin must restore the player avatar'}
        ).toEqual(avatarsBefore);
        await screenshots.capture(page, 'skin-unequipped');
    }

    static async runFailedAdTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let skinData = await TestAdSkins.loadSkinData(gameConfig);
        let playerName = gameConfig.e2ePlayerName;
        let skinAd = await AdMessagesPlayer.enableAd(gameConfig, e2eGroup, skinData.adsKey, playerName);
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, e2eGroup, playerName, skinData.ticketItemKey, 1);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await AdMessagesPlayer.sendAdMessage(page, skinAd, AdsConst.ACTIONS.AD_STARTED);
        await expect.poll(
            async () => {
                let playedAd = await TestAdSkins.fetchPlayedAd(gameConfig, playerName, skinAd.id);
                return Boolean(playedAd?.started_at) && !playedAd.ended_at;
            },
            {message: 'The skin ad start must open the played ad'}
        ).toBe(true);
        await AdMessagesPlayer.sendAdMessage(page, skinAd, AdsConst.ACTIONS.AD_FAILED);
        await expect.poll(
            async () => Boolean((await TestAdSkins.fetchPlayedAd(gameConfig, playerName, skinAd.id)).ended_at),
            {message: 'The failed skin ad must close the played ad'}
        ).toBe(true);
        await screenshots.capture(page, 'skin-ad-failed');
        expect(
            await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.ticketItemKey),
            'The failed skin ad must keep the ticket'
        ).toEqual([1]);
        expect(
            await TestAdSkins.fetchItemQuantities(gameConfig, playerName, skinData.rewardItemKey),
            'The failed skin ad must not give the skin item'
        ).toEqual([]);
    }

    static run()
    {
        test.describe('Ad Skins', () => {
            test('skin ticket ad rewards a skin item that changes the player avatar while equipped', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkins.runAdSkinTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('failed skin ad keeps the ticket and gives no skin item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkins.runFailedAdTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAdSkins.run();
