/**
 *
 * Reldens - DeathRelocationBuilder
 *
 * Builds the death teleport config and the player death event over the relocation room stub: a dead player carrying
 * the restoration item with the given quantity, the active players of the room, the stats save and the revive callback
 * recording every call, and the rooms loaded by ID for the town room name.
 *
 */

const { RelocationRoomBuilder } = require('./relocation-room-builder');
const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class DeathRelocationBuilder
{

    constructor()
    {
        this.roomBuilder = new RelocationRoomBuilder();
        this.restorationItemKey = 'restoration_scroll';
    }

    /**
     * @param {Object} [values]
     * @returns {Object}
     */
    createConfig(values = {})
    {
        return GameplayPlayerBuilder.createConfigManager(Object.assign({
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: true,
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID]: this.roomBuilder.townRoom.roomId,
            [ActionsConst.DEATH.CONFIG_PATHS.RESTORATION_ITEM_KEY]: this.restorationItemKey,
            [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: 60000
        }, values));
    }

    /**
     * @param {Object} [options]
     * @returns {Object}
     */
    createSetup(options = {})
    {
        let setup = this.roomBuilder.build(
            sc.get(options, 'currentRoomName', this.roomBuilder.forestRoom.roomName),
            {isRoomAvailable: sc.get(options, 'isRoomAvailable', true), saveResult: sc.get(options, 'saveResult', true)}
        );
        let restorationItem = GameplayPlayerBuilder.createItem(
            this.restorationItemKey,
            {qty: sc.get(options, 'restorationQty', 0)}
        );
        let inventoryManager = GameplayPlayerBuilder.createInventoryManager({[this.restorationItemKey]: restorationItem});
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema({
            inState: sc.get(options, 'inState', GameConst.STATUS.DEATH),
            physicalBody: setup.playerBody,
            stats: {hp: 0}
        });
        playerSchema.state = setup.playerSchema.state;
        playerSchema.inventory = {manager: inventoryManager};
        setup.playerSchema = playerSchema;
        setup.initialState = Object.assign({}, playerSchema.state);
        setup.activePlayers = sc.get(options, 'activePlayers', [playerSchema.sessionId]);
        setup.savedStats = 0;
        setup.revivedPlayers = 0;
        setup.room.roomId = 'room-id';
        setup.room.activePlayerBySessionId = (sessionId) => -1 !== setup.activePlayers.indexOf(sessionId);
        setup.room.savePlayerStats = async () => {
            setup.savedStats++;
            return true;
        };
        let rooms = [this.roomBuilder.townRoom, this.roomBuilder.forestRoom];
        setup.room.loginManager.roomsManager.loadRoomById = async (roomId) => rooms.find(
            room => roomId === room.roomId
        ) || false;
        setup.event = {
            targetSchema: playerSchema,
            targetClient: setup.client,
            room: setup.room,
            affectedProperty: 'hp',
            revivePlayerCallback: async () => {
                setup.revivedPlayers++;
                return true;
            }
        };
        return setup;
    }

}

module.exports.DeathRelocationBuilder = DeathRelocationBuilder;
