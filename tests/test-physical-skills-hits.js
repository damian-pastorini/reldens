/**
 *
 * Reldens - Test Physical Skills Hits
 *
 * Tests the bullet hit of the physical attack and physical effect skills of a player in a battle (ISSUE #464): a bullet
 * that hits a room object without stats (an NPC, a door, a mining rock, a chest) or a body with no room object only
 * ends (the bullet body is removed and its state body deleted) with no hit event, no hit broadcast and no battle, so
 * the server never reads the missing stats; a bullet that hits an object with stats runs the hit, broadcasts it on the
 * object (the physical effect reads the hit body position) and restarts the battle; and a contact without a bullet
 * body ends without reading a bullet key. The skills are created from their prototypes with the room, the battle and
 * the hit event recorded, and every check runs on both skill types.
 *
 */

const { BaseTest } = require('./base-test');
const TypePhysicalAttack = require('../lib/actions/server/skills/type-physical-attack');
const TypePhysicalEffect = require('../lib/actions/server/skills/type-physical-effect');

class TestPhysicalSkillsHits extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.skillKey = 'e2eBullet';
        this.bulletId = 7;
        this.hitPosition = [100, 200];
        this.skillTypes = {attack: TypePhysicalAttack, effect: TypePhysicalEffect};
    }

    createSkill(SkillType, recorded)
    {
        return Object.assign(Object.create(SkillType.prototype), {
            key: this.skillKey,
            owner: {player_id: 1, broadcastKey: 'session-a', sessionId: 'session-a'},
            validateTargetOnHit: true,
            target: {key: 'aimed-target'},
            fireEvent: async (eventName, hitSkill, hitTarget) => recorded.hitEvents.push(hitTarget.key),
            currentBattle: {
                startBattleWith: async () => recorded.battles.push('start'),
                battleEnded: async () => recorded.battles.push('end'),
                updateTargetClient: async () => recorded.battles.push('update')
            },
            room: {
                broadcast: (clients, message) => recorded.broadcasts.push(message),
                state: {removeBody: (bodyStateKey) => recorded.removedBodies.push(bodyStateKey)},
                playerBySessionIdFromState: () => false,
                getClientById: () => false,
                config: {get: () => 'hp'}
            }
        });
    }

    createRecorded()
    {
        let recorded = {hitEvents: [], broadcasts: [], battles: [], removedBodies: []};
        recorded.bullet = {isBullet: true, id: this.bulletId, world: {removeBodies: []}};
        return recorded;
    }

    async runHit(SkillType, hitBody)
    {
        let recorded = this.createRecorded();
        recorded.result = await this.createSkill(SkillType, recorded).onHit({bodyA: recorded.bullet, bodyB: hitBody});
        recorded.removedFromWorld = recorded.bullet.world.removeBodies.length;
        return recorded;
    }

    async runForEverySkillType(runTypeCheck)
    {
        for(let typeKey of Object.keys(this.skillTypes)){
            await runTypeCheck(typeKey, this.skillTypes[typeKey]);
        }
    }

    expectOnlyEnded(hit, label)
    {
        this.assert.deepStrictEqual(
            [hit.result, hit.hitEvents, hit.broadcasts, hit.battles, hit.removedBodies, hit.removedFromWorld],
            [false, [], [], [], [this.skillKey+'_bullet_'+this.bulletId], 1],
            label
        );
    }

    async testABulletOnAnObjectWithoutStatsOnlyEnds()
    {
        await this.test('a bullet on a room object without stats only ends with no hit, broadcast or battle', async () => {
            await this.runForEverySkillType(async (typeKey, SkillType) => {
                let rock = {key: 'mining-rock', objectBody: {}, state: {x: 1, y: 2}, broadcastKey: 'mining-rock'};
                let hit = await this.runHit(SkillType, {position: this.hitPosition, roomObject: rock});
                this.expectOnlyEnded(hit, 'The '+typeKey+' bullet on an object without stats only ends');
            });
        });
    }

    async testABulletOnABodyWithoutRoomObjectOnlyEnds()
    {
        await this.test('a bullet on a body with no room object only ends with no hit, broadcast or battle', async () => {
            await this.runForEverySkillType(async (typeKey, SkillType) => {
                let hit = await this.runHit(SkillType, {position: this.hitPosition});
                this.expectOnlyEnded(hit, 'The '+typeKey+' bullet on a body without room object only ends');
            });
        });
    }

    async testABulletOnAnObjectWithStatsRunsTheHitAndTheBattle()
    {
        await this.test('a bullet on an object with stats runs the hit, broadcasts it on the object and restarts the battle', async () => {
            let enemy = {key: 'enemy-1', objectBody: {}, stats: {hp: 10}, state: {x: 90, y: 210}, broadcastKey: 'enemy-1'};
            let broadcastPositions = {attack: [enemy.state.x, enemy.state.y], effect: this.hitPosition};
            await this.runForEverySkillType(async (typeKey, SkillType) => {
                let hit = await this.runHit(SkillType, {position: this.hitPosition, roomObject: enemy});
                this.assert.deepStrictEqual(
                    [Boolean(hit.result), hit.hitEvents, hit.broadcasts, hit.battles, hit.removedFromWorld],
                    [false, [enemy.key], [{
                        act: this.skillKey+'_hit',
                        x: broadcastPositions[typeKey][0],
                        y: broadcastPositions[typeKey][1],
                        owner: 'session-a',
                        target: enemy.broadcastKey
                    }], ['start'], 1],
                    'The '+typeKey+' bullet on an object with stats runs the hit and the battle'
                );
            });
        });
    }

    async testAContactWithoutBulletEndsWithoutReadingABulletKey()
    {
        await this.test('a contact without a bullet body ends without reading a bullet key', async () => {
            await this.runForEverySkillType(async (typeKey, SkillType) => {
                let recorded = this.createRecorded();
                recorded.result = await this.createSkill(SkillType, recorded).onHit({
                    bodyA: {position: [0, 0]},
                    bodyB: {position: this.hitPosition}
                });
                this.assert.deepStrictEqual(
                    [recorded.result, recorded.hitEvents, recorded.broadcasts, recorded.battles, recorded.removedBodies],
                    [false, [], [], [], []],
                    'The '+typeKey+' contact without bullet ends'
                );
            });
        });
    }

}

module.exports.TestPhysicalSkillsHits = TestPhysicalSkillsHits;
