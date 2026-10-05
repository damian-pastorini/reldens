/**
 *
 * Reldens - Test Npc Object Interaction Area
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');
const { NpcObject } = require('../lib/objects/server/object/type/npc-object');
const { RandomMovementBodyBuilder } = require('./fixtures/random-movement-body-builder');
const { GameConst } = require('../lib/game/constants');
const { ObjectsConst } = require('../lib/objects/constants');

class TestNpcObjectInteractionArea extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.bodyBuilder = new RandomMovementBodyBuilder();
        this.tileSize = this.bodyBuilder.tileSize;
        this.originalTile = this.bodyBuilder.tile;
    }

    createInteractiveNpc()
    {
        let npc = new NpcObject({
            events: {},
            config: {get: () => this.tileSize, getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {},
            client_key: 'moving_npc',
            id: 1
        });
        npc.setupInteractionArea(false, this.tileSize, this.tileSize);
        return npc;
    }

    async sendInteractionFromMovedPosition(npc)
    {
        let movedPosition = this.tileSize * this.originalTile;
        let sentMessages = [];
        npc.state = {x: movedPosition, y: movedPosition};
        await npc.executeMessageActions(
            {send: (messageKey, message) => sentMessages.push(message)},
            {act: ObjectsConst.OBJECT_INTERACTION, id: npc.id},
            {},
            {state: {x: movedPosition, y: movedPosition}}
        );
        return [...sentMessages].shift();
    }

    async testMovingNpcValidatesTheInteractionAtItsCurrentPosition()
    {
        await this.test('a moving npc validates the interaction at its current body state position', async () => {
            let npc = this.createInteractiveNpc();
            npc.randomMovementBehavior = new ObjectRandomMovement({
                objectBody: this.bodyBuilder.build(),
                getInBattlePlayers: () => ({})
            });
            this.assert.strictEqual((await this.sendInteractionFromMovedPosition(npc)).act, GameConst.UI);
        });
    }

    async testStaticNpcKeepsTheInteractionAreaOfItsCreationPosition()
    {
        await this.test('an npc without random movement keeps the interaction area of its creation position', async () => {
            let npc = this.createInteractiveNpc();
            this.assert.strictEqual(
                (await this.sendInteractionFromMovedPosition(npc)).act,
                GameConst.CLOSE_UI_ACTION
            );
        });
    }

}

module.exports.TestNpcObjectInteractionArea = TestNpcObjectInteractionArea;
