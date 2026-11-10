/**
 *
 * Reldens - Death Drop Steps
 *
 * The steps of the specs with the player items dropped on its death: the drop config paths and values, the drops
 * broadcasts recorded by a client (RoomMessagesRecorder), and the player killed by the forest enemy on its own tile (a
 * tap move to its own position first, so the server body keeps the tile the drops position is read from when the body
 * is removed from the world on the death).
 *
 */

const { DeathReviveSteps } = require('./death-revive-steps');
const { Navigation } = require('./navigation');
const { Phaser } = require('./phaser');
const { ObjectsConst } = require('../../../lib/objects/constants');

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

    static async killOnPlayerTile(context, placement, deathMessage)
    {
        let position = await Phaser.getPlayerServerPosition(context.page);
        await Navigation.moveToWorldPoint(context.page, position.x, position.y);
        await context.page.waitForTimeout(DeathDropSteps.TILE_MOVE_MS);
        await DeathReviveSteps.killPlayerInForest(context, placement, deathMessage);
    }

}

module.exports.DeathDropSteps = DeathDropSteps;
