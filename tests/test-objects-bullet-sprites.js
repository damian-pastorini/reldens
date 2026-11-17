/**
 *
 * Reldens - Test Objects Bullet Sprites
 *
 * Tests the bullet sprite created by the objects client plugin when a bullet body is added to the room state: a body
 * key without "bullet" creates nothing, a skill bullet without its own animation uses and plays the default bullet, a
 * skill bullet with a directional animation uses and plays the animation of the bullet direction, a bullet with no
 * created animation shows the default bullet texture and plays nothing, and a scene without physics creates no sprite
 * and keeps no bullet.
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectsPlugin } = require('../lib/objects/client/plugin');

class TestObjectsBulletSprites extends BaseTest
{

    static BULLET_DEPTH = 11000;

    createSprite(createdSprites, x, y, textureKey)
    {
        let sprite = {x, y, textureKey, depth: 0, playedAnimation: []};
        Object.assign(sprite, {
            setDepth: (depth) => Object.assign(sprite, {depth}),
            anims: {
                play: (animationKey, ignoreIfPlaying) => Object.assign(sprite, {
                    playedAnimation: [animationKey, ignoreIfPlaying]
                })
            }
        });
        createdSprites.push(sprite);
        return sprite;
    }

    createScene(physics, animationsKeys, createdSprites)
    {
        let entries = {};
        for(let animationKey of animationsKeys){
            entries[animationKey] = {};
        }
        return {
            anims: {anims: {entries}},
            physics: physics
                ? {add: {sprite: (x, y, textureKey) => this.createSprite(createdSprites, x, y, textureKey)}}
                : false
        };
    }

    createGameManager(physics, animationsKeys, directionalAnimations, createdSprites = [])
    {
        return {
            createdSprites,
            gameManager: {
                activeRoomEvents: {getActiveScene: () => this.createScene(physics, animationsKeys, createdSprites)},
                gameEngine: {uiScene: {directionalAnimations}}
            }
        };
    }

    createBullet(gameManagerSetup, key, body)
    {
        let plugin = new ObjectsPlugin();
        plugin.bullets = {};
        return [
            plugin.createBulletSprite(key, gameManagerSetup.gameManager, body),
            Object.keys(plugin.bullets),
            gameManagerSetup.createdSprites.map((sprite) => [sprite.textureKey, sprite.x, sprite.y, sprite.depth]),
            gameManagerSetup.createdSprites.map((sprite) => sprite.playedAnimation)
        ];
    }

    async testABodyKeyWithoutBulletCreatesNothing()
    {
        await this.test('a body key without bullet creates no sprite', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(this.createGameManager(true, [], {}), 'enemy_1', {key: 'enemy_1', x: 10, y: 20}),
                [false, [], [], []]
            );
        });
    }

    async testASkillBulletWithoutAnimationUsesTheDefaultBullet()
    {
        await this.test('a skill bullet without its own animation uses and plays the default bullet', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(
                    this.createGameManager(true, ['default_bullet'], {}),
                    'attackBullet_bullet_3',
                    {key: 'attackBullet', x: 10, y: 20, dir: 'right'}
                ),
                [
                    true,
                    ['attackBullet_bullet_3'],
                    [['default_bullet', 10, 20, TestObjectsBulletSprites.BULLET_DEPTH]],
                    [['default_bullet', true]]
                ]
            );
        });
    }

    async testABulletWithoutCreatedAnimationPlaysNothing()
    {
        await this.test('a bullet with no created animation shows the default texture and plays nothing', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(
                    this.createGameManager(true, [], {}),
                    'attackBullet_bullet_6',
                    {key: 'attackBullet', x: 10, y: 20, dir: 'right'}
                ),
                [
                    true,
                    ['attackBullet_bullet_6'],
                    [['default_bullet', 10, 20, TestObjectsBulletSprites.BULLET_DEPTH]],
                    [[]]
                ]
            );
        });
    }

    async testADirectionalSkillBulletUsesItsDirectionAnimation()
    {
        await this.test('a directional skill bullet uses and plays the animation of its direction', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(
                    this.createGameManager(true, ['fireball_bullet_left', 'fireball_bullet_right'], {fireball_bullet: {}}),
                    'fireball_bullet_4',
                    {key: 'fireball', x: 30, y: 40, dir: 'left'}
                ),
                [
                    true,
                    ['fireball_bullet_4'],
                    [['fireball_bullet_left', 30, 40, TestObjectsBulletSprites.BULLET_DEPTH]],
                    [['fireball_bullet_left', true]]
                ]
            );
        });
    }

    async testASceneWithoutPhysicsCreatesNoBulletSprite()
    {
        await this.test('a scene without physics creates no bullet sprite and keeps no bullet', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(
                    this.createGameManager(false, ['default_bullet'], {}),
                    'attackBullet_bullet_5',
                    {key: 'attackBullet', x: 10, y: 20, dir: 'right'}
                ),
                [false, [], [], []]
            );
        });
    }

}

module.exports.TestObjectsBulletSprites = TestObjectsBulletSprites;
