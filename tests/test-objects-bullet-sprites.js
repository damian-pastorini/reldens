/**
 *
 * Reldens - Test Objects Bullet Sprites
 *
 * Tests the bullet sprite created by the objects client plugin when a bullet body is added to the room state: a body
 * key without "bullet" creates nothing, a skill bullet without its own animation uses the default bullet, a skill
 * bullet with a directional animation uses the animation of the bullet direction, and a scene without physics creates
 * no sprite and keeps no bullet.
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectsPlugin } = require('../lib/objects/client/plugin');

class TestObjectsBulletSprites extends BaseTest
{

    static BULLET_DEPTH = 11000;

    createGameManager(physics, animationsKeys, directionalAnimations)
    {
        let createdSprites = [];
        let entries = {};
        for(let animationKey of animationsKeys){
            entries[animationKey] = {};
        }
        let scene = {
            anims: {anims: {entries}},
            physics: physics ? {add: {sprite: (x, y, textureKey) => {
                let sprite = {x, y, textureKey, depth: 0, setDepth: (depth) => {
                    sprite.depth = depth;
                    return sprite;
                }};
                createdSprites.push(sprite);
                return sprite;
            }}} : undefined
        };
        return {
            createdSprites,
            gameManager: {
                activeRoomEvents: {getActiveScene: () => scene},
                gameEngine: {uiScene: {directionalAnimations}}
            }
        };
    }

    createBullet(gameManagerSetup, key, body)
    {
        let plugin = new ObjectsPlugin();
        plugin.bullets = {};
        let created = plugin.createBulletSprite(key, gameManagerSetup.gameManager, body);
        return [
            created,
            Object.keys(plugin.bullets),
            gameManagerSetup.createdSprites.map((sprite) => [sprite.textureKey, sprite.x, sprite.y, sprite.depth])
        ];
    }

    async testABodyKeyWithoutBulletCreatesNothing()
    {
        await this.test('a body key without bullet creates no sprite', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(this.createGameManager(true, [], {}), 'enemy_1', {key: 'enemy_1', x: 10, y: 20}),
                [false, [], []]
            );
        });
    }

    async testASkillBulletWithoutAnimationUsesTheDefaultBullet()
    {
        await this.test('a skill bullet without its own animation uses the default bullet', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(
                    this.createGameManager(true, ['default_bullet'], {}),
                    'attackBullet_bullet_3',
                    {key: 'attackBullet', x: 10, y: 20, dir: 'right'}
                ),
                [true, ['attackBullet_bullet_3'], [['default_bullet', 10, 20, TestObjectsBulletSprites.BULLET_DEPTH]]]
            );
        });
    }

    async testADirectionalSkillBulletUsesItsDirectionAnimation()
    {
        await this.test('a skill bullet with a directional animation uses the animation of its direction', async () => {
            this.assert.deepStrictEqual(
                this.createBullet(
                    this.createGameManager(true, ['fireball_bullet_left', 'fireball_bullet_right'], {fireball_bullet: {}}),
                    'fireball_bullet_4',
                    {key: 'fireball', x: 30, y: 40, dir: 'left'}
                ),
                [true, ['fireball_bullet_4'], [['fireball_bullet_left', 30, 40, TestObjectsBulletSprites.BULLET_DEPTH]]]
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
                [false, [], []]
            );
        });
    }

}

module.exports.TestObjectsBulletSprites = TestObjectsBulletSprites;
