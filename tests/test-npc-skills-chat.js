/**
 *
 * Reldens - Test NPC Skills Chat
 *
 */

const { BaseTest } = require('./base-test');
const { NpcSkills } = require('../lib/chat/server/event-listener/npc-skills');
const { ChatConst } = require('../lib/chat/constants');
const { SkillsEvents, SkillConst } = require('@reldens/skills');
const { EventsManager } = require('@reldens/utils');

class TestNpcSkillsChat extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.allMessagesConfig = {damageMessages: true, effectMessages: true, dodgeMessages: true};
        this.noMessagesConfig = {damageMessages: false, effectMessages: false, dodgeMessages: false};
        this.npcOwner = {key: 'enemy_forest_1', title: 'Tree', uid: 'enemy_forest_1-1', room_id: 5};
    }

    createScenario()
    {
        let scenario = {events: new EventsManager(), sentMessages: [], savedMessages: []};
        scenario.target = {
            playerName: 'ImRoot',
            player_id: 1,
            skillsServer: {client: {client: {send: (message) => scenario.sentMessages.push(message)}}}
        };
        scenario.chatManager = {saveMessage: async (message) => scenario.savedMessages.push(message)};
        return scenario;
    }

    createNpcSkill(events, type)
    {
        return {
            type,
            owner: this.npcOwner,
            ownerIdProperty: 'uid',
            label: 'Attack',
            getOwnerUniqueEventKey: (suffix) => this.npcOwner.uid+'.'+suffix,
            listenEvent: (eventName, callback, removeKey, masterKey) => events.onWithKey(
                this.npcOwner.uid+'.'+eventName,
                callback,
                removeKey,
                masterKey
            )
        };
    }

    async emitNpcSkillEvents(scenario, damage)
    {
        let skill = {owner: this.npcOwner, target: scenario.target, label: 'Attack', lastState: SkillConst.SKILL_STATES.DODGED};
        skill.lastAppliedModifiers = {'stats/atk': -5};
        await scenario.events.emit(this.npcOwner.uid+'.'+SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE, skill, scenario.target, damage);
        await scenario.events.emit(this.npcOwner.uid+'.'+SkillsEvents.SKILL_EFFECT_TARGET_MODIFIERS, skill);
        await scenario.events.emit(this.npcOwner.uid+'.'+SkillsEvents.SKILL_AFTER_RUN_LOGIC, skill);
    }

    listenNpcSkills(scenario, chatConfig)
    {
        let actions = {
            attack: this.createNpcSkill(scenario.events, SkillConst.SKILL.TYPE.ATTACK),
            effect: this.createNpcSkill(scenario.events, SkillConst.SKILL.TYPE.EFFECT)
        };
        NpcSkills.listenEvents({enemyObject: {actions}}, chatConfig, scenario.chatManager);
    }

    async testNpcSkillLinesReachTheTargetPlayer()
    {
        await this.test('the NPC skill damage, modifiers and dodged lines are sent to the target player', async () => {
            let scenario = this.createScenario();
            this.listenNpcSkills(scenario, this.allMessagesConfig);
            await this.emitNpcSkillEvents(scenario, 7);
            this.assert.deepStrictEqual(
                scenario.sentMessages.map(message => message[ChatConst.MESSAGE.KEY]),
                [ChatConst.SNIPPETS.NPC_DAMAGE, ChatConst.SNIPPETS.MODIFIERS_APPLY, ChatConst.SNIPPETS.NPC_DODGED_SKILL]
            );
            this.assert.strictEqual(scenario.savedMessages.length, 3);
        });
    }

    async testNpcSkillLinesOffSendNothing()
    {
        await this.test('the NPC skill lines are not sent with the damage, effect and dodge messages off', async () => {
            let scenario = this.createScenario();
            this.listenNpcSkills(scenario, this.noMessagesConfig);
            await this.emitNpcSkillEvents(scenario, 7);
            this.assert.deepStrictEqual([scenario.sentMessages, scenario.savedMessages], [[], []]);
        });
    }

    async testNpcZeroDamageSendsNoDamageLine()
    {
        await this.test('an NPC skill dealing 0 damage sends no damage line', async () => {
            let scenario = this.createScenario();
            this.listenNpcSkills(scenario, {damageMessages: true});
            await this.emitNpcSkillEvents(scenario, 0);
            this.assert.deepStrictEqual([scenario.sentMessages, scenario.savedMessages], [[], []]);
        });
    }

}

module.exports.TestNpcSkillsChat = TestNpcSkillsChat;
