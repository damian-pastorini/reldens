/**
 *
 * Reldens - Test Npc Object Interaction Area
 *
 */

const { RandomMovementBaseTest } = require('./fixtures/random-movement-base-test');
const { ObjectRandomMovement } = require('../lib/objects/server/object/object-random-movement');
const { NpcObject } = require('../lib/objects/server/object/type/npc-object');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { GameConst } = require('../lib/game/constants');
const { ObjectsConst } = require('../lib/objects/constants');

class TestNpcObjectInteractionArea extends RandomMovementBaseTest
{

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

    async sendInteractionFromMovedPosition(npc, playerPosition = this.tileSize * this.originalTile, playerProps = {})
    {
        let movedPosition = this.tileSize * this.originalTile;
        let sentMessages = [];
        npc.state = {x: movedPosition, y: movedPosition};
        await npc.executeMessageActions(
            {send: (messageKey, message) => sentMessages.push(message)},
            {act: ObjectsConst.OBJECT_INTERACTION, id: npc.id},
            {},
            Object.assign(
                GameplayPlayerBuilder.createPlayerSchema(playerProps),
                {state: {x: playerPosition, y: playerPosition}}
            )
        );
        return [...sentMessages].shift();
    }

    createMovingNpc()
    {
        let npc = this.createInteractiveNpc();
        npc.randomMovementBehavior = new ObjectRandomMovement({
            objectBody: this.bodyBuilder.build(),
            getInBattlePlayers: () => ({})
        });
        return npc;
    }

    async testDeadOrDisabledPlayerGetsTheDialogClosed()
    {
        await this.test('a dead or disabled player in reach gets the npc dialog closed instead of opened', async () => {
            for(let inState of [GameConst.STATUS.DEATH, GameConst.STATUS.DISABLED]){
                let npc = this.createMovingNpc();
                this.assert.deepStrictEqual(
                    await this.sendInteractionFromMovedPosition(npc, this.tileSize * this.originalTile, {inState}),
                    {act: GameConst.CLOSE_UI_ACTION, id: npc.id}
                );
            }
        });
    }

    async testMovingNpcRejectsThePlayerNextToItsSpawnTile()
    {
        await this.test('a moving npc that wandered away rejects the player standing on its spawn tile', async () => {
            let npc = this.createMovingNpc();
            this.assert.strictEqual(
                (await this.sendInteractionFromMovedPosition(npc, this.tileSize)).act,
                GameConst.CLOSE_UI_ACTION
            );
        });
    }

    async testMovingNpcValidatesTheInteractionAtItsCurrentPosition()
    {
        await this.test('a moving npc validates the interaction at its current body state position', async () => {
            let npc = this.createMovingNpc();
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
