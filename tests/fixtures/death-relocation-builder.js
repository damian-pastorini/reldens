/**
 *
 * Reldens - DeathRelocationBuilder
 *
 * Builds the death teleport config and the player death event over the relocation room stub: a dead player carrying
 * the restoration item with the given quantity, the active players of the room, the stats save and the revive callback
 * recording every call, and the rooms loaded by ID for the town room name. The relocator setup adds the death relocator
 * with an events manager that records every emitted event and emits it again on a node EventEmitter, so a test can
 * await it; the death start runs the relocator death and clears its timer. The notifier setup adds the death revive
 * notifier with the enabled resurrection ad and another ad in the ads collection, the room client found by the player
 * session and the resurrection ad reward event, the revive messages expected for the revive where the player died,
 * with the restoration item and in the town room are kept on the builder.
 *
 */

const { RelocationRoomBuilder } = require('./relocation-room-builder');
const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { DeathReviveNotifier } = require('../../lib/actions/server/death-revive-notifier');
const { PlayerDeathRelocator } = require('../../lib/actions/server/player-death-relocator');
const { ActionsConst } = require('../../lib/actions/constants');
const { AdsConst } = require('../../lib/ads/constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
const { EventEmitter } = require('events');

class DeathRelocationBuilder
{

    constructor()
    {
        this.roomBuilder = new RelocationRoomBuilder();
        this.restorationItemKey = 'restoration_scroll';
        this.manualReviveConfig = {[ActionsConst.DEATH.CONFIG_PATHS.AUTO_REVIVE]: false};
        this.askedRestorationItemConfig = {[ActionsConst.DEATH.CONFIG_PATHS.AUTO_CONSUME_RESTORATION_ITEM]: false};
        this.consumedRestorationItem = [{inventoryId: this.restorationItemKey, qty: 1}];
        this.townSceneChange = [{
            scene: this.roomBuilder.townRoom.roomName,
            prev: this.roomBuilder.forestRoom.roomName
        }];
        this.resurrectionAd = {
            id: 7,
            key: 'resurrection-video',
            eventKey: 'reldens.resurrectionAd',
            enabled: 1,
            provider: {enabled: 1}
        };
        this.otherAd = {id: 8, key: 'other-video', enabled: 1, provider: {enabled: 1}};
        let reviveAction = ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE;
        this.inPlaceMessage = {act: reviveAction, mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE};
        this.itemMessage = {
            act: reviveAction,
            mode: ActionsConst.DEATH.REVIVE_MODES.RESTORATION_ITEM,
            itemLabel: this.restorationItemKey
        };
        this.townMessage = {
            act: reviveAction,
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel: this.roomBuilder.townRoom.roomTitle,
            resurrectionAdEventKey: this.resurrectionAd.eventKey
        };
    }

    /**
     * @param {Object} [configValues]
     * @param {Object} [setupOptions]
     * @returns {Object}
     */
    createRelocatorSetup(configValues = {}, setupOptions = {})
    {
        let setup = this.createSetup(setupOptions);
        setup.emittedEvents = [];
        setup.eventsEmitter = new EventEmitter();
        setup.relocator = new PlayerDeathRelocator({
            config: this.createConfig(configValues),
            events: {
                emit: async (eventKey, eventData) => {
                    setup.emittedEvents.push({eventKey, eventData});
                    setup.eventsEmitter.emit(eventKey, eventData);
                }
            }
        });
        return setup;
    }

    /**
     * @param {Object} setup
     * @returns {boolean}
     */
    startDeath(setup)
    {
        let isHandled = setup.relocator.onPlayerDeath(setup.event);
        clearTimeout(setup.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER));
        return isHandled;
    }

    /**
     * @param {Object} [configValues]
     * @param {Object} [setupOptions]
     * @returns {Object}
     */
    createNotifierSetup(configValues = {}, setupOptions = {})
    {
        let config = this.createConfig(Object.assign({
            [ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY]: this.resurrectionAd.key,
            [AdsConst.CONFIG_PATHS.COLLECTION]: {
                [this.resurrectionAd.id]: this.resurrectionAd,
                [this.otherAd.id]: this.otherAd
            }
        }, configValues));
        let setup = this.createSetup(setupOptions);
        setup.room.getClientById = (sessionId) => sessionId === setup.playerSchema.sessionId ? setup.client : false;
        setup.rewardEvent = {
            playedAd: Object.assign({}, this.resurrectionAd),
            room: setup.room,
            playerSchema: setup.playerSchema
        };
        setup.relocator = new PlayerDeathRelocator({config});
        setup.notifier = new DeathReviveNotifier({config, playerDeathRelocator: setup.relocator});
        setup.notify = async () => await setup.notifier.notifyClient(setup.client, setup.playerSchema, setup.room);
        return setup;
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
