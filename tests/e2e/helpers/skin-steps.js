/**
 *
 * Reldens - Skin Steps
 *
 * The steps of the skin specs: the skin data read from the stored config and rows (the skin ad key, the ticket item key,
 * the skin item rewarded by the skin ad and its skin key); the group players entered with their skin tickets seeded and
 * the skin ad enabled for them (AdMessagesPlayer), the skin ad start and end messages a client sends with the wait for
 * the provider minimum duration, and the stored played skin ads and ticket and skin item quantities of a player; and the
 * sprite of a player on a client (its avatar key, and whether its texture and its current animation are the ones of the
 * mapped avatar), polled until it shows the expected avatar.
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { AdMessagesPlayer } = require('./ad-messages-player');
const { TradeSteps } = require('./trade-steps');
const { TeamSteps } = require('./team-steps');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { TimeConstants } = require('./time-constants');
const { UsersConst } = require('../../../lib/users/constants');
const { AdsConst } = require('../../../lib/ads/constants');
const { InventoryConst } = require('../../../lib/inventory/constants');
const { sc } = require('@reldens/utils');

class SkinSteps
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
                [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {key: rewardItemKey})].shift().customData,
                {}
            ).skinKey
        };
    }

    static async enterWithTickets(context, ticketsQuantities)
    {
        let gameConfig = context.gameConfig;
        let skinData = await SkinSteps.loadSkinData(gameConfig);
        let skinAd = false;
        for(let suffix of TeamSteps.USER_SUFFIXES.slice(0, ticketsQuantities.length)){
            skinAd = await AdMessagesPlayer.enableAd(gameConfig, context.e2eGroup, skinData.adsKey, gameConfig['e2ePlayerName'+suffix]);
        }
        return {
            skinData,
            skinAd,
            players: await TradeSteps.enterPlayers(
                context,
                ticketsQuantities.length,
                ticketsQuantities.map((qty, playerIndex) => ({playerIndex, itemKey: skinData.ticketItemKey, qty})).filter(
                    seededTicket => 0 < seededTicket.qty
                )
            )
        };
    }

    static async useTicketAndWaitForAd(context, player, skinTickets)
    {
        await AdMessagesPlayer.waitForProviderReady(player.page, TimeConstants.UI_OPEN);
        await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.USE, skinTickets.skinData.ticketItemKey);
        await AdMessagesPlayer.waitForPlayedAd(player.page, skinTickets.skinAd, TimeConstants.UI_OPEN);
    }

    static async endAdAfterMinimumDuration(player, skinAd)
    {
        await player.page.waitForTimeout(skinAd.minimumDurationMs + AdMessagesPlayer.PLAY_MARGIN_MS);
        await RoomMessagesRecorder.sendMessage(player.page, {act: AdsConst.ACTIONS.AD_ENDED, ads_id: skinAd.id});
    }

    static async playAd(player, skinAd)
    {
        await RoomMessagesRecorder.sendMessage(player.page, {act: AdsConst.ACTIONS.AD_STARTED, ads_id: skinAd.id});
        await SkinSteps.endAdAfterMinimumDuration(player, skinAd);
    }

    static async fetchPlayedAdsEnded(gameConfig, playerName, skinAd)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'adsPlayed', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            ads_id: skinAd.id
        })).map(row => Boolean(row.ended_at));
    }

    static async expectPlayedAd(context, player, skinAd, expectedEnded, message)
    {
        await expect.poll(
            async () => await SkinSteps.fetchPlayedAdsEnded(context.gameConfig, player.playerName, skinAd),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expectedEnded);
    }

    static async fetchItems(gameConfig, playerName, skinData)
    {
        return {
            tickets: await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, playerName, skinData.ticketItemKey),
            skins: await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, playerName, skinData.rewardItemKey)
        };
    }

    static async expectItems(context, player, skinData, expectedItems, message)
    {
        await expect.poll(
            async () => await SkinSteps.fetchItems(context.gameConfig, player.playerName, skinData),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expectedItems);
    }

    static async fetchSprite(page, playerName)
    {
        return await page.evaluate((searchedName) => {
            let sprites = window.reldens.getActiveScene()?.player?.players || {};
            let sprite = sprites[Object.keys(sprites).find(spriteKey => searchedName === sprites[spriteKey].playerName)];
            if(!sprite){
                return false;
            }
            return {
                avatarKey: sprite.avatarKey,
                hasAvatarTexture: window.reldens.mappedAvatars?.[sprite.avatarKey] === sprite.texture.key,
                hasAvatarAnimation: String(sprite.anims?.currentAnim?.key || '').startsWith(
                    window.reldens.mappedAvatars?.[sprite.avatarKey]+'_'
                )
            };
        }, playerName);
    }

    static async expectSprite(page, playerName, avatarKey, message)
    {
        await expect.poll(
            async () => await SkinSteps.fetchSprite(page, playerName),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expect.objectContaining({avatarKey, hasAvatarTexture: true}));
    }

}

module.exports.SkinSteps = SkinSteps;
