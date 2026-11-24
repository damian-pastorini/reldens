/**
 *
 * Reldens - DeathRelocationBuilder
 *
 * Builds the death teleport config and the player death event over the relocation room stub: a dead player carrying
 * the restoration item with the given quantity, the active players of the room, the stats save and the revive callback
 * (that revives the player) recording every call, and the rooms loaded by ID for the town room. The relocator is
 * created as the plugin does it: with an events manager that records every emitted event and emits it again on a node
 * EventEmitter, so a test can await it, and its town room loaded from the rooms manager as on the server ready. The
 * death start runs the relocator death and clears its timer. The notifier setup wires the events as the plugins do: a
 * real events manager, the ads ResurrectionAdGate (the enabled resurrection ad and another ad in the ads collection, the
 * resurrection ads key and the ads collection overridable by the setup options) answering "reldens.deathTownReviveData", and the death revive notifier sending the
 * revive message on "reldens.deathReviveNotify"; with the room client found by the player session, the
 * real room allowed actions check with the given room custom data (none by default) and the resurrection ad reward
 * event, the revive messages expected for the revive where the player died, with the restoration
 * item and in the town room are kept on the builder. The offline deaths setup adds the room config with the hp
 * affected property, the users manager recording the stored updates, the room activate and deactivate recording the
 * player states, the scene players state handler timers (cleared through the real RoomScene method) and the
 * OfflinePlayerDeaths of the setup relocator, built as the actions plugin does it and given the users manager and the
 * login manager players room state as on the server ready; a death is
 * recorded and kept with its offline timer cleared, and the next join of the player with the given life, state and
 * session answers the restore result, the joined player and the revive delay of its loaded death.
 *
 */

const { RelocationRoomBuilder } = require('./relocation-room-builder');
const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { DeathReviveNotifier } = require('../../lib/actions/server/death-revive-notifier');
const { ResurrectionAdGate } = require('../../lib/ads/server/resurrection-ad-gate');
const { PlayerDeathRelocator } = require('../../lib/actions/server/player-death-relocator');
const { OfflinePlayerDeaths } = require('../../lib/actions/server/offline-player-deaths');
const { RoomScene } = require('../../lib/rooms/server/scene');
const { ActionsConst } = require('../../lib/actions/constants');
const { AdsConst } = require('../../lib/ads/constants');
const { GameConst } = require('../../lib/game/constants');
const { sc, EventsManager } = require('@reldens/utils');
const { EventEmitter } = require('events');

class DeathRelocationBuilder
{

    constructor()
    {
        this.roomBuilder = new RelocationRoomBuilder();
        this.hpStatId = 3;
        this.gameOverTimeOut = 60000;
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
        this.townMessageWithoutAd = {
            act: reviveAction,
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel: this.roomBuilder.townRoom.roomTitle
        };
        this.townMessage = Object.assign({}, this.townMessageWithoutAd, {resurrectionAdEventKey: this.resurrectionAd.eventKey});
    }

    /**
     * @param {Object} setup
     * @param {Object} [configValues]
     * @returns {Promise<PlayerDeathRelocator>}
     */
    async createRelocator(setup, configValues = {})
    {
        setup.emittedEvents = [];
        setup.eventsEmitter = new EventEmitter();
        let relocator = new PlayerDeathRelocator({
            config: this.createConfig(configValues),
            events: {
                emit: async (eventKey, eventData) => {
                    setup.emittedEvents.push({eventKey, eventData});
                    setup.eventsEmitter.emit(eventKey, eventData);
                }
            }
        });
        setup.isTownRoomLoaded = await relocator.loadTownRoom(setup.room.loginManager.roomsManager);
        relocator.loadConfig();
        return relocator;
    }

    /**
     * @param {Object} [configValues]
     * @param {Object} [setupOptions]
     * @returns {Promise<Object>}
     */
    async createRelocatorSetup(configValues = {}, setupOptions = {})
    {
        let setup = this.createSetup(setupOptions);
        setup.relocator = await this.createRelocator(setup, configValues);
        return setup;
    }

    /**
     * @param {Object} assert
     * @param {Object} setup
     */
    assertRevivedWithRestorationItem(assert, setup)
    {
        assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, this.consumedRestorationItem);
        assert.strictEqual(setup.revivedPlayers, 1);
        assert.deepStrictEqual(setup.sceneChanges, []);
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
     * @returns {Promise<Object>}
     */
    async createNotifierSetup(configValues = {}, setupOptions = {})
    {
        let setup = this.createSetup(setupOptions);
        setup.room.getClientById = (sessionId) => sessionId === setup.playerSchema.sessionId ? setup.client : false;
        setup.room.customData = sc.get(setupOptions, 'roomCustomData', {});
        setup.room.isAllowedAction = RoomScene.prototype.isAllowedAction;
        setup.playerSchema.skillsServer.classPath.currentSkills = {};
        setup.rewardEvent = {
            playedAd: Object.assign({}, this.resurrectionAd),
            room: setup.room,
            playerSchema: setup.playerSchema
        };
        setup.relocator = await this.createRelocator(setup, configValues);
        setup.events = new EventsManager();
        setup.gate = new ResurrectionAdGate({
            events: setup.events,
            adsKey: sc.get(setupOptions, 'resurrectionAdsKey', this.resurrectionAd.key),
            adsCollection: sc.get(
                setupOptions,
                'adsCollection',
                {[this.resurrectionAd.id]: this.resurrectionAd, [this.otherAd.id]: this.otherAd}
            ),
            maximumDuration: AdsConst.VIDEOS_MAXIMUM_DURATION
        });
        setup.events.on('reldens.deathTownReviveData', (event) => setup.gate.onTownReviveData(event));
        setup.notifier = new DeathReviveNotifier({playerDeathRelocator: setup.relocator, events: setup.events});
        setup.events.on('reldens.deathReviveNotify', (event) => setup.notifier.notifyClient(
            event.room.getClientById(event.playerSchema.sessionId),
            event.playerSchema,
            event.room
        ));
        setup.notify = () => setup.notifier.notifyClient(setup.client, setup.playerSchema, setup.room);
        return setup;
    }

    /**
     * @param {Object} [configValues]
     * @returns {Promise<Object>}
     */
    async createOfflineDeathsSetup(configValues = {})
    {
        let setup = await this.createRelocatorSetup(configValues);
        setup.room.config = GameplayPlayerBuilder.createConfigManager({
            'client/actions/skills/affectedProperty': 'hp',
            'client/players/initialStats/hp': {id: this.hpStatId}
        });
        setup.storedUpdates = [];
        setup.usersManager = {
            updatePlayerStatByIds: async (playerId, statId, patch) => setup.storedUpdates.push(['stat', playerId, statId, patch]),
            updateUserStateByPlayerId: async (playerId, state) => setup.storedUpdates.push(['state', playerId, state])
        };
        setup.room.deactivatePlayer = (playerSchema, inState) => playerSchema.inState = inState;
        setup.activatedStates = [];
        setup.room.activatePlayer = (playerSchema, inState) => {
            setup.activatedStates.push(inState);
            playerSchema.inState = inState;
        };
        setup.room.playersLastStateTimers = {};
        setup.room.clearPlayerLastStateTimer = RoomScene.prototype.clearPlayerLastStateTimer;
        setup.room.roomWorld = {removeBodies: []};
        setup.room.broadcast = () => true;
        setup.offlineDeaths = new OfflinePlayerDeaths({
            playerDeathRelocator: setup.relocator,
            events: setup.room.events,
            config: setup.room.config,
            affectedProperty: setup.room.config.get('client/actions/skills/affectedProperty')
        });
        setup.offlineDeaths.loadServerManagers({usersManager: setup.usersManager, loginManager: setup.room.loginManager});
        return setup;
    }

    /**
     * @param {Object} setup
     * @returns {boolean}
     */
    keepOfflineDeathWithoutTimer(setup)
    {
        setup.offlineDeaths.recordDeath({room: setup.room, targetSchema: setup.playerSchema});
        let isKept = setup.offlineDeaths.keepDeath({room: setup.room, playerSchema: setup.playerSchema});
        clearTimeout(setup.offlineDeaths.deathsByPlayerId[setup.playerSchema.player_id]?.timer);
        return isKept;
    }

    /**
     * @param {Object} setup
     * @param {number} joinedLife
     * @param {string|number} [joinedState]
     * @param {string} [joinedSessionId]
     * @returns {Promise<Object>}
     */
    async joinOfflineDeathAgain(setup, joinedLife, joinedState = GameConst.STATUS.ACTIVE, joinedSessionId = 'session-7')
    {
        let joinedPlayer = GameplayPlayerBuilder.createPlayerSchema({
            sessionId: joinedSessionId,
            stats: {hp: joinedLife},
            inState: joinedState,
            physicalBody: setup.playerBody
        });
        joinedPlayer.state = setup.playerSchema.state;
        let isRestored = await setup.offlineDeaths.restoreDeath({
            roomScene: setup.room,
            client: setup.client,
            loggedPlayer: joinedPlayer
        });
        clearTimeout(joinedPlayer.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER));
        return {
            isRestored,
            joinedPlayer,
            reviveDelayMs: sc.get(sc.get(setup.room.events.emittedEvents.find(
                emitted => 'reldens.playerDeathRestored' === emitted.eventName
            ), 'event', {}), 'reviveDelayMs', false),
            isNewDeathEmitted: setup.room.events.emittedEvents.some(emitted => 'reldens.playerDeath' === emitted.eventName)
        };
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
            [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: this.gameOverTimeOut
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
            reviveDelayMs: this.gameOverTimeOut,
            revivePlayerCallback: async () => {
                setup.revivedPlayers++;
                playerSchema.inState = GameConst.STATUS.ACTIVE;
                return true;
            }
        };
        return setup;
    }

}

module.exports.DeathRelocationBuilder = DeathRelocationBuilder;
