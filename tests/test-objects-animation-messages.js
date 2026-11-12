/**
 *
 * Reldens - Test Objects Animation Messages
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectsPlugin } = require('../lib/objects/client/plugin');
const { ObjectBattleAnimation } = require('../lib/objects/client/object-battle-animation');
const { ObjectsConst } = require('../lib/objects/constants');
const { ActionsConst } = require('../lib/actions/constants');

class TestObjectsAnimationMessages extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.doorKey = 'door_house_3';
        this.enemyKey = 'enemy_forest_1';
        this.attackKey = 'attackShort';
        this.deathMessage = {act: ActionsConst.BATTLE_ENDED, x: 320, y: 480, t: this.enemyKey, k: this.attackKey};
        this.retryProps = {missingSpritesTimeOut: 150, missingSpritesMaxRetries: 2};
        this.scheduledTimeouts = [];
    }

    createAnimationScene(runAnimations)
    {
        let scene = {objectsAnimations: {}};
        scene.objectsAnimations[this.doorKey] = {runAnimation: () => runAnimations.push(this.doorKey)};
        return {activeRoomEvents: {getActiveScene: () => scene}};
    }

    createDeathScene(availableChecks, deathAnimations)
    {
        let deathScene = {sprites: [], player: {currentTarget: false, players: {}}, physics: {add: {}}};
        deathScene.getAnimationByKey = () => availableChecks.shift();
        deathScene.physics.add.sprite = (x, y, key) => this.addDeathSprite(deathScene, x, y, key);
        deathScene.gameManager = {
            config: {client: {skills: {animations: deathAnimations}}},
            activeRoomEvents: {getActiveScene: () => deathScene},
            gameEngine: {clearTarget: () => true}
        };
        return deathScene;
    }

    addDeathSprite(deathScene, x, y, key)
    {
        let sprite = {x, y, key, depth: 0, listeners: {}, played: false, destroyed: false};
        sprite.setDepth = (depth) => Object.assign(sprite, {depth});
        sprite.destroy = () => Object.assign(sprite, {destroyed: true});
        sprite.anims = {play: () => Object.assign(sprite, {played: true}).anims};
        sprite.anims.on = (eventName, callback) => Object.assign(sprite.listeners, {[eventName]: callback});
        deathScene.sprites.push(sprite);
        return sprite;
    }

    withScheduledTimeouts(testCallback)
    {
        this.scheduledTimeouts = [];
        let originalSetTimeout = global.setTimeout;
        global.setTimeout = (callback, delay) => this.scheduledTimeouts.push({callback, delay});
        try {
            testCallback();
        } catch(error) {
            global.setTimeout = originalSetTimeout;
            throw error;
        }
        global.setTimeout = originalSetTimeout;
    }

    runScheduledTimeouts()
    {
        let delays = [];
        while(0 < this.scheduledTimeouts.length){
            let nextTimeout = this.scheduledTimeouts.shift();
            delays.push(nextTimeout.delay);
            nextTimeout.callback();
        }
        return delays;
    }

    async testAnimationMessageRunsTheObjectAnimationAndIgnoresAnUnknownKey()
    {
        await this.test('the oa and anim messages run the object animation and an unknown key or act runs nothing', async () => {
            let runAnimations = [];
            let gameManager = this.createAnimationScene(runAnimations);
            let plugin = new ObjectsPlugin();
            let results = [
                plugin.startObjectAnimation({act: ObjectsConst.OBJECT_ANIMATION, key: this.doorKey}, gameManager),
                plugin.startObjectAnimation({act: ObjectsConst.TYPE_ANIMATION, key: this.doorKey}, gameManager),
                plugin.startObjectAnimation({act: ObjectsConst.OBJECT_ANIMATION, key: 'door_missing'}, gameManager),
                plugin.startObjectAnimation({act: ObjectsConst.OBJECT_INTERACTION, key: this.doorKey}, gameManager)
            ];
            this.assert.deepStrictEqual(results.map(result => false !== result), [true, true, false, false]);
            this.assert.deepStrictEqual(runAnimations, [this.doorKey, this.doorKey]);
        });
    }

    async testDeathAnimationPlaysOnTheDeadPositionAndIsDestroyedAtTheEnd()
    {
        await this.test('the death animation plays on the dead position and its sprite is destroyed at the end', async () => {
            let deathScene = this.createDeathScene([true], {});
            new ObjectBattleAnimation({}).objectBattleEndAnimation(this.deathMessage, deathScene.gameManager);
            let deathSprite = deathScene.sprites[0];
            this.assert.deepStrictEqual(
                [deathSprite.key, deathSprite.x, deathSprite.y, deathSprite.depth, deathSprite.played, deathSprite.destroyed],
                ['default_death', this.deathMessage.x, this.deathMessage.y, 10500, true, false]
            );
            deathSprite.listeners.animationcomplete();
            this.assert.strictEqual(deathSprite.destroyed, true);
        });
    }

    async testDeathAnimationNotLoadedIsRetriedUntilAvailable()
    {
        await this.test('a death animation not loaded yet is retried every time out until available or the retries limit', async () => {
            let laterScene = this.createDeathScene([false, true], {});
            let missingScene = this.createDeathScene([false, false, false], {});
            let scheduledDelays = [];
            this.withScheduledTimeouts(() => {
                new ObjectBattleAnimation(this.retryProps).objectBattleEndAnimation(this.deathMessage, laterScene.gameManager);
                new ObjectBattleAnimation(this.retryProps).objectBattleEndAnimation(this.deathMessage, missingScene.gameManager);
                scheduledDelays = this.runScheduledTimeouts();
            });
            this.assert.deepStrictEqual(
                [laterScene.sprites.map(sprite => sprite.key), missingScene.sprites.length, scheduledDelays],
                [['default_death'], 0, [150, 150, 150]]
            );
        });
    }

}

module.exports.TestObjectsAnimationMessages = TestObjectsAnimationMessages;
