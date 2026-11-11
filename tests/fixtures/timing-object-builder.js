/**
 *
 * Reldens - TimingObjectBuilder
 *
 * Builds a timing object with the given private params and duration, placed with its interaction area, and the setup
 * around it: the player schema in reach with its stats, private data and states, an inventory that records the added
 * items, a client that records the sent actions and the room that finds the player and the client by the session. It
 * runs a timing with a player change, starts a reward timing with the given item add, and asserts a busy timing and a
 * timing end that freed the object and the player.
 *
 */

const timersPromises = require('node:timers/promises');
const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { TimingObject } = require('../../lib/objects/server/object/type/timing-object');
const { ObjectsConst } = require('../../lib/objects/constants');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');

class TimingObjectBuilder
{

    constructor()
    {
        this.affectedProperty = 'hp';
        this.startHp = 100;
        this.timingDuration = 5000;
        this.shortTimingDuration = 50;
        this.checksWaitMs = 350;
        this.objectId = 1;
        this.objectKey = 'timing_object';
        this.secondObjectKey = 'second_timing_object';
        this.objectPosition = 100;
        this.outOfReachPosition = 300;
        this.sessionId = 'session-1';
        this.activeTimingKey = ObjectsConst.ACTIVE_TIMING_KEY;
        this.interactionMessage = {act: ObjectsConst.OBJECT_INTERACTION, id: this.objectId};
        this.freePlayer = {inState: GameConst.STATUS.ACTIVE, runningTiming: false};
        this.oreRewards = {rewards: [{key: 'ore', rate: 100}]};
        this.configValues = {
            'client/actions/skills/affectedProperty': this.affectedProperty,
            'server/objects/actions/interactionsDistance': 50
        };
    }

    /**
     * @param {Object} privateParams
     * @param {number} [timingDuration]
     * @param {string} [objectKey]
     * @returns {TimingObject}
     */
    createTimingObject(privateParams, timingDuration = this.timingDuration, objectKey = this.objectKey)
    {
        let timingObject = new TimingObject({
            events: {},
            config: {
                get: (path) => this.configValues[path],
                getWithoutLogs: (path, defaultValue) => defaultValue
            },
            dataServer: {},
            client_key: objectKey,
            id: this.objectId,
            client_params: sc.toJsonString({timingDuration}),
            private_params: sc.toJsonString(privateParams)
        });
        timingObject.setupInteractionArea(false, this.objectPosition, this.objectPosition);
        return timingObject;
    }

    /**
     * @param {Object} privateParams
     * @param {number} [timingDuration]
     * @returns {Object}
     */
    createTimingSetup(privateParams, timingDuration = this.timingDuration)
    {
        let timingSetup = {
            timingObject: this.createTimingObject(privateParams, timingDuration),
            client: {sessionId: this.sessionId, sentActions: []},
            addedItems: [],
            playerSchema: GameplayPlayerBuilder.createPlayerSchema({
                sessionId: this.sessionId,
                stats: {[this.affectedProperty]: this.startHp}
            })
        };
        timingSetup.client.send = (type, data) => timingSetup.client.sentActions.push(data.act);
        timingSetup.playerSchema.state = {x: this.objectPosition, y: this.objectPosition};
        timingSetup.playerSchema.inventory = {
            manager: {
                createItemInstance: (itemKey) => ({key: itemKey}),
                addItem: async (item) => timingSetup.addedItems.push(item.key)
            }
        };
        timingSetup.roomPlayers = {[timingSetup.client.sessionId]: timingSetup.playerSchema};
        timingSetup.room = {
            config: timingSetup.timingObject.config,
            playerBySessionIdFromState: (sessionId) => sc.get(timingSetup.roomPlayers, sessionId, false),
            getClientById: (sessionId) => sessionId === timingSetup.client.sessionId ? timingSetup.client : false
        };
        return timingSetup;
    }

    /**
     * @param {Object} privateParams
     * @param {Object} playerCase
     * @returns {Object}
     */
    createPlayerCaseSetup(privateParams, playerCase)
    {
        let timingSetup = this.createTimingSetup(privateParams);
        timingSetup.playerSchema.inState = playerCase.inState;
        timingSetup.playerSchema.setPrivate(this.activeTimingKey, playerCase.runningTiming);
        return timingSetup;
    }

    /**
     * @param {Object} privateParams
     * @param {Function} changePlayer
     * @returns {Promise<Object>}
     */
    async runTimingWithPlayerChange(privateParams, changePlayer)
    {
        let timingSetup = this.createTimingSetup(privateParams);
        let timingObject = timingSetup.timingObject;
        timingObject.startTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
        await changePlayer(timingSetup.playerSchema, timingSetup);
        await timersPromises.setTimeout(this.checksWaitMs);
        clearInterval(timingObject.timingCheckInterval);
        clearTimeout(timingObject.timingTimer);
        return {
            sentActions: timingSetup.client.sentActions,
            isActive: timingObject.isActive,
            activeTiming: timingSetup.playerSchema.getPrivate(this.activeTimingKey)
        };
    }

    /**
     * @param {Function|false} [addItem]
     * @returns {Object}
     */
    startRewardTiming(addItem = false)
    {
        let timingSetup = this.createTimingSetup(this.oreRewards, this.shortTimingDuration);
        if(addItem){
            timingSetup.playerSchema.inventory.manager.addItem = addItem;
        }
        timingSetup.timingObject.startTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
        return timingSetup;
    }

    /**
     * @param {Function|false} [addItem]
     * @returns {Promise<Object>}
     */
    async runRewardTiming(addItem = false)
    {
        let timingSetup = this.startRewardTiming(addItem);
        await timersPromises.setTimeout(this.checksWaitMs);
        return timingSetup;
    }

    /**
     * @param {Object} assert
     * @param {Object} timingSetup
     */
    assertBusyTiming(assert, timingSetup)
    {
        assert.strictEqual(timingSetup.timingObject.isActive, true);
        assert.strictEqual(timingSetup.timingObject.timingPlayer, timingSetup.playerSchema);
        assert.strictEqual(timingSetup.playerSchema.getPrivate(this.activeTimingKey), this.objectKey);
    }

    /**
     * @param {Object} assert
     * @param {Object} timingSetup
     * @param {Array<string>} sentActions
     */
    assertFreedTiming(assert, timingSetup, sentActions)
    {
        assert.deepStrictEqual(timingSetup.client.sentActions, sentActions);
        assert.strictEqual(timingSetup.timingObject.isActive, false);
        assert.strictEqual(timingSetup.timingObject.timingPlayer, null);
        assert.strictEqual(timingSetup.playerSchema.getPrivate(this.activeTimingKey), null);
    }

}

module.exports.TimingObjectBuilder = TimingObjectBuilder;
