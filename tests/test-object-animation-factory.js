/**
 *
 * Reldens - Test Object Animation Factory
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectAnimationFactory } = require('../lib/objects/client/object-animation-factory');
const { GameConst } = require('../lib/game/constants');

class TestObjectAnimationFactory extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomName = 'reldens-forest';
        this.objectKey = 'enemy_forest_1';
        this.initialPosition = {x: 100, y: 120};
        this.currentPosition = {x: 300, y: 340};
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
