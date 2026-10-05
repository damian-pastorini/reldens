/**
 *
 * Reldens - Test Skill Hit After Owner Left
 *
 * A player can cast a skill, log out, and the skill still hits the target after the player was removed.
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerSkills } = require('../lib/chat/server/event-listener/player-skills');
const { UsersPlugin } = require('../lib/users/server/plugin');
const { RoomScene } = require('../lib/rooms/server/scene');
const { SkillsEvents } = require('@reldens/skills');
const { EventsManager } = require('@reldens/utils');
const { setTimeout: waitFor } = require('node:timers/promises');

class TestSkillHitAfterOwnerLeft extends BaseTest
{

    createOwner(sentMessages)
    {
        return {
            eventsPrefix: 'p1.session-a',
            player_id: 1,
            playerName: 'ImRoot',
            state: {room_id: 4},
            skillsServer: {client: {client: {send: (message) => sentMessages.push(message)}}}
        };
    }

    createOwnerClassPath(events, owner)
    {
        return {
            owner,
            getOwnerEventKey: () => owner.eventsPrefix,
            getOwnerUniqueEventKey: (suffix) => owner.eventsPrefix+'.'+suffix,
            listenEvent: (eventName, callback, removeKey, masterKey) => events.onWithKey(
                owner.eventsPrefix+'.'+eventName,
                callback,
                removeKey,
                masterKey
            )
        };
    }

    createChatScenario()
    {
        let events = new EventsManager();
        let scenario = {events, sentMessages: [], savedMessages: []};
        scenario.classPath = this.createOwnerClassPath(events, this.createOwner(scenario.sentMessages));
        scenario.chatManager = {saveMessage: async (message) => scenario.savedMessages.push(message)};
        return scenario;
    }

    listenOwnerRemovalOnDamage(events, classPath)
    {
        events.on(classPath.getOwnerEventKey()+'.'+SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE, async () => {
            events.offByMasterKey(classPath.getOwnerEventKey());
            classPath.owner.skillsServer = null;
        });
    }

    async emitDamage(events, classPath)
    {
        let target = {key: 'enemy-1', title: 'Enemy'};
        await events.emit(
            classPath.getOwnerEventKey()+'.'+SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
            {owner: classPath.owner, target},
            target,
            10
        );
    }

    async testChatDamageMessageIsSentWhileTheOwnerIsConnected()
    {
        await this.test('a skill hit sends the damage chat message while the owner is connected', async () => {
            let scenario = this.createChatScenario();
            PlayerSkills.listenEvents(scenario.classPath, {damageMessages: true}, scenario.chatManager);
            await this.emitDamage(scenario.events, scenario.classPath);
            this.assert.strictEqual(scenario.sentMessages.length, 1);
            this.assert.strictEqual(scenario.savedMessages.length, 1);
        });
    }

    async testChatDamageMessageIsSkippedWhenTheOwnerLeftDuringTheHit()
    {
        await this.test('a skill hit after the owner left skips the damage chat message without throwing', async () => {
            let scenario = this.createChatScenario();
            this.listenOwnerRemovalOnDamage(scenario.events, scenario.classPath);
            PlayerSkills.listenEvents(scenario.classPath, {damageMessages: true}, scenario.chatManager);
            await this.emitDamage(scenario.events, scenario.classPath);
            this.assert.strictEqual(scenario.classPath.owner.skillsServer, null);
            this.assert.strictEqual(scenario.sentMessages.length, 0);
            this.assert.strictEqual(scenario.savedMessages.length, 0);
        });
    }

    async testLifebarUpdateIsSkippedWhenTheOwnerLeftDuringTheHit()
    {
        await this.test('a skill hit after the owner left skips the lifebar update without throwing', async () => {
            let scenario = this.createChatScenario();
            let broadcastTargets = [];
            let usersPlugin = Object.create(UsersPlugin.prototype);
            usersPlugin.broadcastObjectUpdate = async (client, target) => broadcastTargets.push(target);
            this.listenOwnerRemovalOnDamage(scenario.events, scenario.classPath);
            await usersPlugin.addEventListenerOnSkillAttackApplyDamage({}, scenario.classPath);
            await this.emitDamage(scenario.events, scenario.classPath);
            this.assert.strictEqual(scenario.classPath.owner.skillsServer, null);
            this.assert.strictEqual(broadcastTargets.length, 0);
        });
    }

    async testPendingCastIsCancelledWhenTheOwnerIsRemoved()
    {
        await this.test('a skill still in its cast time is cancelled when the owner is removed', async () => {
            let castFinished = [];
            let room = Object.create(RoomScene.prototype);
            room.events = new EventsManager();
            room.roomWorld = {};
            Object.defineProperty(room, 'state', {value: {removePlayer: () => true}});
            let playerSchema = this.createOwner([]);
            playerSchema.isCasting = true;
            playerSchema.castingTimer = setTimeout(() => castFinished.push(true));
            playerSchema.getPrivate = () => false;
            room.removeAllPlayerReferences(playerSchema, 'session-a');
            await waitFor();
            this.assert.strictEqual(castFinished.length, 0);
            this.assert.strictEqual(playerSchema.isCasting, false);
            this.assert.strictEqual(playerSchema.castingTimer, null);
        });
    }

}

module.exports.TestSkillHitAfterOwnerLeft = TestSkillHitAfterOwnerLeft;
