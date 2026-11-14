/**
 *
 * Reldens - Death Drop Steps
 *
 * The steps of the specs with the player items dropped on its death: the drop config paths and values (the death
 * teleport off and the drop percent at 100 unless overridden), the drops broadcasts recorded by a client
 * (RoomMessagesRecorder), the drop objects of the forest room read from the server (DropsProbe, including the drops the
 * clients never received), the player entering the forest with its messages recorded, and the player killed by the
 * forest enemy on its own tile (a tap move to its own position first, so the server body keeps the tile the drops
 * position is read from when the body is removed from the world on the death). The player inventory can carry only its
 * equipped axe (the heal potions stack moved to the second player, its own potions rows preserved first so the reset
 * removes the moved stack before restoring them), an equipped item can be seeded and the stored rows of several item
 * keys of the player loaded together.
 *
 */

const { DeathReviveSteps } = require('./death-revive-steps');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { SecurityApi } = require('./security-api');
const { Navigation } = require('./navigation');
const { Phaser } = require('./phaser');
const { Login } = require('./login');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { ActionsConst } = require('../../../lib/actions/constants');

class DeathDropSteps
{

    static DROP_QUANTITY_PATH = 'server/players/drop/quantity';
    static FULL_DROP_PERCENT = 100;
    static TILE_MOVE_MS = 500;

    static async fetchDrops(clientPage)
    {
        return await clientPage.evaluate(
            (dropsKey) => (window.e2eRoomMessages || []).filter(message => message[dropsKey]).map(
                message => message[dropsKey]
            ),
            ObjectsConst.DROPS.KEY
        );
    }

    static async fetchRoomDrops(gameConfig)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/drops/state?roomName='+encodeURIComponent(Login.FOREST_ROOM_NAME)
        )).drops;
    }

    static async prepareDrops(context, dropValues)
    {
        await DeathReviveSteps.prepareDeath(context, Object.assign({
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false,
            [DeathReviveSteps.DROP_PERCENT_PATH]: DeathDropSteps.FULL_DROP_PERCENT
        }, dropValues));
    }

    static async enterForDrops(context)
    {
        let placement = await DeathReviveSteps.enterForest(context, true);
        await RoomMessagesRecorder.start(context.page);
        return placement;
    }

    static async killOnPlayerTile(context, placement, deathMessage)
    {
        let position = await Phaser.getPlayerServerPosition(context.page);
        await Navigation.moveToWorldPoint(context.page, position.x, position.y);
        await context.page.waitForTimeout(DeathDropSteps.TILE_MOVE_MS);
        await DeathReviveSteps.killPlayerInForest(context, placement, deathMessage);
    }

    static async carryOnlyTheEquippedAxe(context)
    {
        let gameConfig = context.gameConfig;
        let potionKey = gameConfig.e2eConsumableItemId;
        let axeFilters = await E2eSeedAndRestoreApi.fetchInventoryFilters(
            gameConfig,
            gameConfig.e2ePlayerName,
            gameConfig.e2eEquipableItemId
        );
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'itemsInventory', axeFilters, {is_active: 1});
        let secondPlayerPotionFilters = await E2eSeedAndRestoreApi.fetchInventoryFilters(
            gameConfig,
            Login.fetchSecondPlayerConfig(gameConfig).e2ePlayerName,
            potionKey
        );
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'itemsInventory', secondPlayerPotionFilters);
        await E2eSeedAndRestoreApi.updateWithPreserve(
            gameConfig,
            context.e2eGroup,
            'itemsInventory',
            await E2eSeedAndRestoreApi.fetchInventoryFilters(gameConfig, gameConfig.e2ePlayerName, potionKey),
            {owner_id: secondPlayerPotionFilters.owner_id}
        );
        return axeFilters;
    }

    static async seedEquippedItem(context, itemKey)
    {
        let seededRow = await E2eSeedAndRestoreApi.seedInventoryItem(
            context.gameConfig,
            context.e2eGroup,
            context.gameConfig.e2ePlayerName,
            itemKey,
            1
        );
        await E2eSeedAndRestoreApi.updateCreatedRow(context.gameConfig, context.e2eGroup, 'itemsInventory', seededRow.id, {
            'is_active': 1
        });
    }

    static async fetchInventoryRows(context, itemKeys)
    {
        return (await Promise.all(itemKeys.map(
            itemKey => E2eSeedAndRestoreApi.loadInventoryRows(context.gameConfig, context.gameConfig.e2ePlayerName, itemKey)
        ))).flat();
    }

}

module.exports.DeathDropSteps = DeathDropSteps;
