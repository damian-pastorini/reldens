/**
 *
 * Reldens - PlayerSkills
 *
 */

const { PlayerDamageCallback } = require('../messages/player-damage-callback');
const { PlayerModifiersCallback } = require('../messages/player-modifiers-callback');
const { PlayerDodgeCallback } = require('../messages/player-dodge-callback');
const { SkillsEvents, SkillConst } = require('@reldens/skills');

class PlayerSkills
{

    static listenEvents(classPath, chatConfig, chatManager)
    {
        this.listenDamageEvent(chatConfig, classPath, chatManager);
        this.listenModifiersEvent(chatConfig, classPath, chatManager);
        this.listenAfterRunLogicEvent(chatConfig, classPath, chatManager);
    }

    static listenDamageEvent(chatConfig, classPath, chatManager)
    {
        if(!chatConfig.damageMessages){
            return;
        }
        classPath.listenEvent(
            SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
            async (skill, target, damage) => {
                if(!damage){
                    return;
                }
                await PlayerDamageCallback.sendMessage({
                    skill,
                    target,
                    damage,
                    client: classPath.owner.skillsServer.client.client,
                    chatManager: chatManager
                });
            },
            classPath.getOwnerUniqueEventKey('skillAttackApplyDamageChat'),
            classPath.getOwnerEventKey()
        );
    }

    static listenModifiersEvent(chatConfig, classPath, chatManager)
    {
        if(!chatConfig.effectMessages){
            return;
        }
        classPath.listenEvent(
            SkillsEvents.SKILL_EFFECT_TARGET_MODIFIERS,
            async (skill) => {
                await PlayerModifiersCallback.sendMessage({
                    skill,
                    client: classPath.owner.skillsServer.client.client,
                    chatManager: chatManager
                });
            },
            classPath.getOwnerUniqueEventKey('skillApplyModifiersChat'),
            classPath.getOwnerEventKey()
        );
    }

    static listenAfterRunLogicEvent(chatConfig, classPath, chatManager)
    {
        if(!chatConfig.dodgeMessages){
            return;
        }
        classPath.listenEvent(
            SkillsEvents.SKILL_AFTER_RUN_LOGIC,
            async (skill) => {
                if(SkillConst.SKILL_STATES.DODGED !== skill.lastState){
                    return;
                }
                await PlayerDodgeCallback.sendMessage({
                    skill,
                    client: classPath.owner.skillsServer.client.client,
                    chatManager: chatManager
                });
            },
            classPath.getOwnerUniqueEventKey('skillDodgeChat'),
            classPath.getOwnerEventKey()
        );
    }

}

module.exports.PlayerSkills = PlayerSkills;
