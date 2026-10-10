/**
 *
 * Reldens - Test Animation Object Action Visibility
 *
 */

const { BaseTest } = require('./base-test');
const { AnimationObject } = require('../lib/objects/server/object/type/animation-object');
const { NpcObject } = require('../lib/objects/server/object/type/npc-object');
const { ObjectsConst } = require('../lib/objects/constants');
const { GameConst } = require('../lib/game/constants');

class TestAnimationObjectActionVisibility extends BaseTest
{

    createChestObject(visibility, ObjectClass = AnimationObject)
    {
        return Object.assign(
            new ObjectClass({
                events: {},
                config: {get: () => 32, getWithoutLogs: (path, defaultValue) => defaultValue},
                dataServer: {},
                client_key: 'chest_forest_1',
                id: 18
            }),
            {runOnAction: true, runOnHit: true},
            visibility
        );
    }

    async sendNpcMessage(npcObject, act)
    {
        let sentToPlayer = [];
        let client = {sessionId: 'session1', send: (messageKey, message) => sentToPlayer.push(message)};
        npcObject.setupInteractionArea(false, 32, 32);
        await npcObject.executeMessageActions(
            client,
            {act, id: npcObject.id, value: 'open'},
            {broadcast: () => true, getClientById: () => client},
            {state: {x: 32, y: 32}, physicalBody: {playerId: client.sessionId}}
        );
        return sentToPlayer.map(message => message.act);
    }

    runTrigger(animationObject, triggerMethod)
    {
        let roomMessages = {broadcasted: [], sentToPlayer: []};
        let playerBody = {playerId: 'session1'};
        animationObject[triggerMethod]({
            room: {
                broadcast: (messageKey, message) => roomMessages.broadcasted.push(message),
                getClientById: (playerId) => playerBody.playerId === playerId
                    ? {send: (messageKey, message) => roomMessages.sentToPlayer.push(message)}
                    : false
            },
            playerBody,
            bodyA: {},
            bodyB: playerBody
        });
        return roomMessages;
    }

    async testThePlayerVisibleAnimationIsSentOnlyToThePlayer()
    {
        await this.test('a player visible animation is sent only to the player who executed the action', async () => {
            let animationObject = this.createChestObject({playerVisible: true});
            let roomMessages = this.runTrigger(animationObject, 'onAction');
            this.assert.deepStrictEqual(roomMessages.sentToPlayer, [animationObject.animationData]);
            this.assert.deepStrictEqual(roomMessages.broadcasted, []);
        });
    }

    async testTheRoomVisibleAnimationIsOnlyBroadcasted()
    {
        await this.test('a room visible animation is broadcasted and not sent again to the player', async () => {
            let animationObject = this.createChestObject({roomVisible: true});
            let roomMessages = this.runTrigger(animationObject, 'onAction');
            this.assert.deepStrictEqual(roomMessages.broadcasted, [animationObject.animationData]);
            this.assert.deepStrictEqual(roomMessages.sentToPlayer, []);
        });
    }

    async testTheNotVisibleAnimationIsNotSent()
    {
        await this.test('an animation without room or player visibility is not sent', async () => {
            this.assert.deepStrictEqual(
                this.runTrigger(this.createChestObject({}), 'onAction'),
                {broadcasted: [], sentToPlayer: []}
            );
        });
    }

    async testThePlayerVisibleHitAnimationIsSentOnlyToTheHittingPlayer()
    {
        await this.test('a player visible hit animation is sent only to the player who hit the object', async () => {
            let animationObject = this.createChestObject({playerVisible: true});
            let roomMessages = this.runTrigger(animationObject, 'onHit');
            this.assert.deepStrictEqual(roomMessages.sentToPlayer, [animationObject.animationData]);
            this.assert.deepStrictEqual(roomMessages.broadcasted, []);
        });
    }

    async testTheRoomVisibleHitAnimationIsOnlyBroadcasted()
    {
        await this.test('a room visible hit animation is broadcasted and not sent again to the player', async () => {
            let animationObject = this.createChestObject({roomVisible: true});
            let roomMessages = this.runTrigger(animationObject, 'onHit');
            this.assert.deepStrictEqual(roomMessages.broadcasted, [animationObject.animationData]);
            this.assert.deepStrictEqual(roomMessages.sentToPlayer, []);
        });
    }

    async testTheNotVisibleHitAnimationIsNotSent()
    {
        await this.test('a hit animation without room or player visibility is not sent', async () => {
            this.assert.deepStrictEqual(
                this.runTrigger(this.createChestObject({}), 'onHit'),
                {broadcasted: [], sentToPlayer: []}
            );
        });
    }

    async testTheNpcInteractionRunsTheActionAnimation()
    {
        await this.test('the npc interaction sends the object animation before the npc dialog', async () => {
            let npcObject = this.createChestObject({playerVisible: true}, NpcObject);
            this.assert.deepStrictEqual(
                await this.sendNpcMessage(npcObject, ObjectsConst.OBJECT_INTERACTION),
                [ObjectsConst.OBJECT_ANIMATION, GameConst.UI]
            );
        });
    }

    async testTheNpcOptionDoesNotRunTheActionAnimation()
    {
        await this.test('choosing an npc option does not run the object animation again', async () => {
            let npcObject = this.createChestObject({playerVisible: true, options: {open: {label: 'Open'}}}, NpcObject);
            this.assert.deepStrictEqual(await this.sendNpcMessage(npcObject, GameConst.BUTTON_OPTION), [GameConst.UI]);
        });
    }

}

module.exports.TestAnimationObjectActionVisibility = TestAnimationObjectActionVisibility;
