/**
 *
 * Reldens - Test Object Animation Factory
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectAnimationFactory } = require('../lib/objects/client/object-animation-factory');
const { GameConst } = require('../lib/game/constants');
const { ObjectsConst } = require('../lib/objects/constants');
const { sc } = require('@reldens/utils');

class TestObjectAnimationFactory extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomName = 'reldens-forest';
        this.objectKey = 'enemy_forest_1';
        this.initialPosition = {x: 100, y: 120};
        this.currentPosition = {x: 300, y: 340};
        this.npcKey = 'people_town_1';
        this.stoppedNpcBody = {x: 320, y: 400, dir: 'down', mov: false, inState: GameConst.STATUS.ACTIVE};
    }

    createActiveRoomEvents(inState)
    {
        let bodies = new Map();
        bodies.set(this.objectKey, Object.assign({inState}, this.currentPosition));
        return {roomName: this.roomName, room: {state: {bodies}}};
    }

    prepareJoiningSprite(inState)
    {
        let factory = new ObjectAnimationFactory({});
        let animProps = Object.assign({key: this.objectKey}, this.initialPosition);
        let existentBody = factory.fetchExistentBody({key: this.roomName}, this.createActiveRoomEvents(inState), animProps);
        factory.updateAnimationPosition(existentBody, animProps);
        let sprite = {visible: true};
        factory.updateAnimationVisibility(existentBody, sprite);
        return {position: {x: animProps.x, y: animProps.y}, visible: sprite.visible};
    }

    createAnimationsScene(animationsKeys, objectAnimation)
    {
        let entries = {};
        for(let animationKey of animationsKeys){
            entries[animationKey] = {key: animationKey};
        }
        return {anims: {anims: {entries}}, objectsAnimations: {[this.npcKey]: objectAnimation}};
    }

    createMovingNpcAnimation(autoStart, playedAnimations)
    {
        return {
            key: this.npcKey,
            layerName: 'ground',
            id: 5,
            autoStart,
            updateObjectAndSpritePositions: () => true,
            updateObjectDepth: () => 0,
            sceneSprite: {anims: {
                play: (animation) => playedAnimations.push(sc.get(animation, 'key', animation)),
                stop: () => playedAnimations.push('stop')
            }}
        };
    }

    stopNpcWithAutoStart(autoStart)
    {
        let stopCase = {playedAnimations: []};
        stopCase.result = new ObjectAnimationFactory({emit: () => true}).updateObjectsAnimations(
            this.npcKey,
            this.stoppedNpcBody,
            this.createAnimationsScene([this.npcKey+'_down', this.npcKey], this.createMovingNpcAnimation(autoStart, stopCase.playedAnimations))
        );
        return stopCase;
    }

    async testMovingObjectPlaysItsDirectionAnimationByPriority()
    {
        await this.test('a moving object plays its key direction, then its layer and id direction, then its key animation', async () => {
            let factory = new ObjectAnimationFactory({});
            let objectAnimation = {key: this.npcKey, layerName: 'ground', id: 5};
            let body = {dir: 'down'};
            let keyDirection = this.npcKey+'_down';
            let layerDirection = 'ground_5_down';
            this.assert.deepStrictEqual(
                [
                    factory.fetchAvailableAnimationKey(this.createAnimationsScene([keyDirection, layerDirection, this.npcKey]), objectAnimation, body).key,
                    factory.fetchAvailableAnimationKey(this.createAnimationsScene([layerDirection, this.npcKey]), objectAnimation, body).key,
                    factory.fetchAvailableAnimationKey(this.createAnimationsScene([this.npcKey]), objectAnimation, body).key,
                    factory.fetchAvailableAnimationKey(this.createAnimationsScene([]), objectAnimation, body)
                ],
                [keyDirection, layerDirection, this.npcKey, '']
            );
        });
    }

    async testStoppedObjectPlaysItsAutoStartAnimation()
    {
        await this.test('a stopped object plays its key, its dynamic direction or its named animation by autoStart', async () => {
            this.assert.deepStrictEqual(
                [
                    this.stopNpcWithAutoStart(true),
                    this.stopNpcWithAutoStart(ObjectsConst.DYNAMIC_ANIMATION),
                    this.stopNpcWithAutoStart(this.npcKey+'_idle')
                ],
                [
                    {result: true, playedAnimations: [this.npcKey+'_down', 'stop', this.npcKey]},
                    {result: true, playedAnimations: [this.npcKey+'_down', 'stop', this.npcKey+'_down']},
                    {result: true, playedAnimations: [this.npcKey+'_down', 'stop', this.npcKey+'_idle']}
                ]
            );
        });
    }

    async testStoppedObjectWithoutAutoStartStopsItsAnimation()
    {
        await this.test('a stopped object without autoStart stops its animation and plays nothing else', async () => {
            this.assert.deepStrictEqual(
                this.stopNpcWithAutoStart(false),
                {result: false, playedAnimations: [this.npcKey+'_down', 'stop']}
            );
        });
    }

    async testJoiningClientHidesTheDeadOrDisabledObjects()
    {
        await this.test('a joining client creates the sprite of a dead or disabled object hidden on its current body', async () => {
            this.assert.deepStrictEqual(
                [
                    this.prepareJoiningSprite(GameConst.STATUS.DEATH),
                    this.prepareJoiningSprite(GameConst.STATUS.DISABLED),
                    this.prepareJoiningSprite(GameConst.STATUS.ACTIVE)
                ],
                [
                    {position: this.currentPosition, visible: false},
                    {position: this.currentPosition, visible: false},
                    {position: this.currentPosition, visible: true}
                ]
            );
        });
    }

}

module.exports.TestObjectAnimationFactory = TestObjectAnimationFactory;
