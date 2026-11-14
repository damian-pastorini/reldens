/**
 *
 * Reldens - Test Pve Chase Time Out
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { RelocationRoomBuilder } = require('./fixtures/relocation-room-builder');
const { Pve } = require('../lib/actions/server/pve');
const { PlayerRelocator } = require('../lib/rooms/server/player-relocator');
const { AnimationObject } = require('../lib/objects/server/object/type/animation-object');
const { GameConst } = require('../lib/game/constants');
const timersPromises = require('timers/promises');

class TestPveChaseTimeOut extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.relocationRoomName = 'reldens-town';
        this.relocationPosition = {x: 300, y: 200};
    }

    createChaseSetup(chaseTimeOut)
    {
        let setup = {chasedBodies: [], originMoves: 0, delayedStarts: 0, emittedEvents: [], chaseTimeOut};
        let events = {emit: async (eventName) => setup.emittedEvents.push(eventName)};
        setup.pve = new Pve({fetchChaseTimeOut: () => setup.chaseTimeOut, events});
        setup.pve.setTargetObject({
            id: 'enemy-1',
            uid: 'enemy-uid',
            state: {inState: GameConst.STATUS.ACTIVE},
            stats: {hp: 50},
            chaseBody: (body) => {
                setup.chasedBodies.push(body);
                return [[1, 1]];
            },
            objectBody: {
                bodyState: {inState: GameConst.STATUS.ACTIVE},
                velocity: [1, 1],
                resetAuto: () => true,
                moveToOriginalPoint: () => setup.originMoves++
            }
        });
        setup.pve.startBattleWithDelay = async () => setup.delayedStarts++;
        setup.playerSchema = GameplayPlayerBuilder.createPlayerSchema({physicalBody: {id: 'player-body'}});
        setup.pve.inBattleWithPlayers[setup.playerSchema.player_id] = true;
        return setup;
    }

    expectStillChasing(setup)
    {
        this.assert.deepStrictEqual(setup.chasedBodies, [setup.playerSchema.physicalBody]);
        this.assert.strictEqual(setup.delayedStarts, 1);
        this.assert.strictEqual(setup.originMoves, 0);
        this.assert.strictEqual(setup.pve.inBattleWithPlayers[setup.playerSchema.player_id], true);
    }

    async testDisabledChaseTimeOutKeepsChasing()
    {
        await this.test('a missing, zero, negative or invalid chase time out keeps the enemy chasing', async () => {
            for(let chaseTimeOut of [0, -1, 'none', null]){
                let setup = this.createChaseSetup(chaseTimeOut);
                setup.pve.lastHitAt[setup.playerSchema.player_id] = Date.now() - 60000;
                await setup.pve.chasePlayer(setup.playerSchema, {}, {});
                this.expectStillChasing(setup);
            }
        });
    }

    async testChaseTimeOutSinceTheLastHitLeavesTheBattle()
    {
        await this.test('the time out passed since the last hit makes the enemy leave and go back', async () => {
            let setup = this.createChaseSetup(1000);
            setup.pve.lastHitAt[setup.playerSchema.player_id] = Date.now() - 1000;
            this.assert.strictEqual(await setup.pve.chasePlayer(setup.playerSchema, {}, {}), true);
            this.assert.deepStrictEqual(setup.chasedBodies, []);
            this.assert.strictEqual(setup.delayedStarts, 0);
            this.assert.strictEqual(setup.originMoves, 1);
            this.assert.deepStrictEqual(setup.pve.inBattleWithPlayers, {});
            this.assert.deepStrictEqual(setup.pve.lastHitAt, {});
        });
    }

    async testChaseWithoutPathFinderLeavesTheBattle()
    {
        await this.test('a chase of an object body without world or world path finder fails and the enemy leaves the battle', async () => {
            for(let objectWorld of [false, {}]){
                let setup = this.createChaseSetup(0);
                setup.pve.targetObject.chaseBody = AnimationObject.prototype.chaseBody;
                setup.pve.targetObject.objectBody.world = objectWorld;
                await setup.pve.chasePlayer(setup.playerSchema, {}, {});
                this.assert.deepStrictEqual(
                    [setup.delayedStarts, setup.originMoves, setup.pve.inBattleWithPlayers],
                    [0, 1, {}]
                );
            }
        });
    }

    async testRecentHitOrNoHitKeepsChasing()
    {
        await this.test('a hit before the time out or a battle without hits keeps the enemy chasing', async () => {
            let recentHitSetup = this.createChaseSetup(1000);
            recentHitSetup.pve.lastHitAt[recentHitSetup.playerSchema.player_id] = Date.now() - 500;
            await recentHitSetup.pve.chasePlayer(recentHitSetup.playerSchema, {}, {});
            this.expectStillChasing(recentHitSetup);
            let withoutHitSetup = this.createChaseSetup(1000);
            await withoutHitSetup.pve.chasePlayer(withoutHitSetup.playerSchema, {}, {});
            this.expectStillChasing(withoutHitSetup);
        });
    }

    async testOtherPlayerHitDoesNotResetTheChase()
    {
        await this.test('the time out of every player counts from its own last hit', async () => {
            let setup = this.createChaseSetup(1000);
            setup.pve.lastHitAt[setup.playerSchema.player_id] = Date.now() - 2000;
            setup.pve.lastHitAt[99] = Date.now();
            await setup.pve.chasePlayer(setup.playerSchema, {}, {});
            this.assert.strictEqual(setup.originMoves, 1);
            this.assert.deepStrictEqual(Object.keys(setup.pve.lastHitAt), ['99']);
        });
    }

    async testEnemyHitResetsTheChaseTimeOut()
    {
        await this.test('every enemy hit on the player resets the chase time out', async () => {
            let setup = this.createChaseSetup(1000);
            setup.pve.lastHitAt[setup.playerSchema.player_id] = Date.now() - 5000;
            setup.pve.updateTargetClient = async () => true;
            let room = {getClientById: () => GameplayPlayerBuilder.createClient()};
            let executedActions = [];
            let enemyAction = {key: 'bite', execute: async () => executedActions.push('bite')};
            let hitStart = Date.now();
            await setup.pve.attackInRange(enemyAction, setup.playerSchema, room);
            this.assert.deepStrictEqual(executedActions, ['bite']);
            this.assert.deepStrictEqual(setup.pve.targetObject.objectBody.velocity, [0, 0]);
            this.assert.ok(hitStart <= setup.pve.lastHitAt[setup.playerSchema.player_id]);
            await setup.pve.chasePlayer(setup.playerSchema, room, {});
            this.assert.strictEqual(setup.originMoves, 0);
            this.assert.strictEqual(setup.delayedStarts, 2);
        });
    }

    async testPlayerHitResetsTheChaseTimeOut()
    {
        await this.test('every player hit on the enemy resets the chase time out', async () => {
            let setup = this.createChaseSetup(1000);
            setup.pve.lastHitAt[setup.playerSchema.player_id] = Date.now() - 5000;
            let continuedPlayers = [];
            setup.pve.continueBattleWith = async (playerSchema) => {
                continuedPlayers.push(playerSchema.player_id);
                return true;
            };
            setup.playerSchema.state = {inState: GameConst.STATUS.ACTIVE};
            setup.playerSchema.currentAction = 'attackShort';
            setup.playerSchema.actions = {attackShort: {key: 'attackShort', execute: async () => true}};
            setup.playerSchema.skillsServer = {classPath: {currentSkills: {}}};
            let roomScene = {config: {get: () => 'hp'}};
            let hitStart = Date.now();
            let attackResult = await setup.pve.runBattle(setup.playerSchema, setup.pve.targetObject, roomScene);
            this.assert.strictEqual(attackResult, true);
            this.assert.ok(hitStart <= setup.pve.lastHitAt[setup.playerSchema.player_id]);
            this.assert.deepStrictEqual(continuedPlayers, [setup.playerSchema.player_id]);
            this.assert.deepStrictEqual(setup.emittedEvents, ['reldens.runBattlePveAfter']);
            await setup.pve.chasePlayer(setup.playerSchema, roomScene, {});
            this.assert.strictEqual(setup.originMoves, 0);
        });
    }

    async testBusyEnemyIgnoresTheOtherPlayerHits()
    {
        await this.test('the hits of a player the busy enemy is not fighting keep no hit time', async () => {
            let setup = this.createChaseSetup(1000);
            this.assert.strictEqual(setup.pve.registerPlayerHit(99), false);
            this.assert.deepStrictEqual(Object.keys(setup.pve.lastHitAt), []);
            this.assert.strictEqual(setup.pve.registerPlayerHit(setup.playerSchema.player_id), true);
            setup.pve.chaseMultiple = true;
            for(let missingPlayerId of [null, 0, '', false]){
                this.assert.strictEqual(setup.pve.registerPlayerHit(missingPlayerId), false);
            }
            this.assert.strictEqual(setup.pve.registerPlayerHit(99), true);
            let hitPlayersIds = Object.keys(setup.pve.lastHitAt).sort();
            this.assert.deepStrictEqual(hitPlayersIds, ['99', String(setup.playerSchema.player_id)].sort());
        });
    }

    async testStartBattleWithResetsTheChaseTimeOut()
    {
        await this.test('every start battle call (skill or bodies hit) resets the chase time out', async () => {
            let setup = this.createChaseSetup(1000);
            setup.pve.lastHitAt[setup.playerSchema.player_id] = Date.now() - 5000;
            let continuedPlayers = [];
            setup.pve.continueBattleWith = async (playerSchema) => continuedPlayers.push(playerSchema);
            let hitStart = Date.now();
            await setup.pve.startBattleWith(setup.playerSchema, {});
            this.assert.ok(hitStart <= setup.pve.lastHitAt[setup.playerSchema.player_id]);
            this.assert.deepStrictEqual(continuedPlayers, [setup.playerSchema]);
            let otherPlayerSchema = GameplayPlayerBuilder.createPlayerSchema({playerId: 99});
            await setup.pve.startBattleWith(otherPlayerSchema, {});
            this.assert.deepStrictEqual(Object.keys(setup.pve.lastHitAt), [String(setup.playerSchema.player_id)]);
            await setup.pve.startBattleWith(null, {});
            this.assert.deepStrictEqual(Object.keys(setup.pve.lastHitAt), [String(setup.playerSchema.player_id)]);
            this.assert.deepStrictEqual(continuedPlayers, [setup.playerSchema, otherPlayerSchema, null]);
        });
    }

    async testEnemyBattleLoopKeepsTheLastHitTime()
    {
        await this.test('the enemy own battle loop, delayed or not, never resets the chase time out', async () => {
            let setup = this.createChaseSetup(1000);
            delete setup.pve.startBattleWithDelay;
            let keptHitAt = Date.now() - 500;
            setup.pve.lastHitAt[setup.playerSchema.player_id] = keptHitAt;
            let continuedPlayers = [];
            setup.pve.continueBattleWith = async (playerSchema) => continuedPlayers.push(playerSchema);
            await setup.pve.startBattleWithDelay(setup.playerSchema, {}, {skillDelay: 0});
            this.assert.deepStrictEqual(continuedPlayers, [setup.playerSchema]);
            let skillDelay = 1;
            await setup.pve.startBattleWithDelay(setup.playerSchema, {}, {skillDelay});
            this.assert.deepStrictEqual(continuedPlayers, [setup.playerSchema]);
            await timersPromises.setTimeout(skillDelay);
            this.assert.deepStrictEqual(continuedPlayers, [setup.playerSchema, setup.playerSchema]);
            this.assert.strictEqual(setup.pve.lastHitAt[setup.playerSchema.player_id], keptHitAt);
        });
    }

    async testSameRoomRelocationKeepsTheEnemyChasing()
    {
        await this.test('a player relocated inside the same room is still chased by the enemy in battle with it', async () => {
            let setup = this.createChaseSetup(0);
            let relocation = new RelocationRoomBuilder().build(this.relocationRoomName);
            relocation.playerBody.world = {worldKey: this.relocationRoomName};
            relocation.playerSchema.stats = {hp: 10};
            setup.playerSchema = relocation.playerSchema;
            setup.pve.inBattleWithPlayers = {[relocation.playerSchema.player_id]: true};
            setup.pve.targetObject.actionsKeys = ['bite'];
            setup.pve.targetObject.actions = {bite: {validate: () => false}};
            setup.pve.targetObject.objectBody.world = {worldKey: this.relocationRoomName};
            let relocated = await new PlayerRelocator(relocation.room).relocate(
                relocation.client,
                relocation.playerSchema,
                this.relocationRoomName,
                this.relocationPosition
            );
            this.assert.strictEqual(relocated, true);
            await setup.pve.continueBattleWith(relocation.playerSchema, {
                roomWorld: {},
                state: {},
                playerBySessionIdFromState: () => true,
                config: {get: () => 'hp'}
            });
            this.expectStillChasing(setup);
            this.assert.deepStrictEqual(
                relocation.playerBody.position,
                [this.relocationPosition.x, this.relocationPosition.y]
            );
        });
    }

    async testBattleStartCountsAsTheFirstHit()
    {
        await this.test('the battle start counts as the first hit and the enemy loop never replaces it', async () => {
            let setup = this.createChaseSetup(1000);
            setup.pve.targetObject.actionsKeys = ['bite'];
            setup.pve.targetObject.actions = {bite: {validate: () => false}};
            setup.pve.targetObject.objectBody.world = {worldKey: 'forest'};
            setup.playerSchema.physicalBody.world = {worldKey: 'forest'};
            setup.playerSchema.stats = {hp: 10};
            let room = {roomWorld: {}, state: {}, playerBySessionIdFromState: () => true, config: {get: () => 'hp'}};
            let battleStart = Date.now();
            await setup.pve.startBattleWith(setup.playerSchema, room);
            this.assert.ok(battleStart <= setup.pve.lastHitAt[setup.playerSchema.player_id]);
            this.assert.strictEqual(setup.delayedStarts, 1);
            let keptHitAt = Date.now() - 500;
            setup.pve.lastHitAt[setup.playerSchema.player_id] = keptHitAt;
            await setup.pve.continueBattleWith(setup.playerSchema, room);
            this.assert.strictEqual(setup.pve.lastHitAt[setup.playerSchema.player_id], keptHitAt);
            this.assert.strictEqual(setup.delayedStarts, 2);
            delete setup.pve.lastHitAt[setup.playerSchema.player_id];
            let loopStart = Date.now();
            await setup.pve.continueBattleWith(setup.playerSchema, room);
            this.assert.ok(loopStart <= setup.pve.lastHitAt[setup.playerSchema.player_id]);
            this.assert.strictEqual(setup.delayedStarts, 3);
        });
    }

}

module.exports.TestPveChaseTimeOut = TestPveChaseTimeOut;
