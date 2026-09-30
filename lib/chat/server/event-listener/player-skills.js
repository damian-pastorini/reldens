/**
 *
 * Reldens - PlayerSkills
 *
 * Listens for player skill events and sends chat messages for damage, modifiers, and dodges.
 *
 */

const { PlayerDamageCallback } = require('../messages/player-damage-callback');
const { PlayerModifiersCallback } = require('../messages/player-modifiers-callback');
const { PlayerDodgeCallback } = require('../messages/player-dodge-callback');
const { SkillsEvents, SkillConst } = require('@reldens/skills');
const { Logger } = require('@reldens/utils');

class PlayerSkills
{

    /**
     * @param {Object} classPath
     * @param {Object} chatConfig
     * @param {Object} chatManager
     */
    static listenEvents(classPath, chatConfig, chatManager)
    {
        this.listenDamageEvent(chatConfig, classPath, chatManager);
        this.listenModifiersEvent(chatConfig, classPath, chatManager);
        this.listenAfterRunLogicEvent(chatConfig, classPath, chatManager);
    }

    /**
     * @param {Object} chatConfig
     * @param {Object} classPath
     * @param {Object} chatManager
     */
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
                let client = this.fetchOwnerClient(classPath);
                if(!client){
                    return;
                }
                await PlayerDamageCallback.sendMessage({skill, target, damage, client, chatManager});
            },
            classPath.getOwnerUniqueEventKey('skillAttackApplyDamageChat'),
            classPath.getOwnerEventKey()
        );
    }

    /**
     * @param {Object} chatConfig
     * @param {Object} classPath
     * @param {Object} chatManager
     */
    static listenModifiersEvent(chatConfig, classPath, chatManager)
    {
        if(!chatConfig.effectMessages){
            return;
        }
        classPath.listenEvent(
            SkillsEvents.SKILL_EFFECT_TARGET_MODIFIERS,
            async (skill) => {
                let client = this.fetchOwnerClient(classPath);
                if(!client){
                    return;
                }
                await PlayerModifiersCallback.sendMessage({skill, client, chatManager});
            },
            classPath.getOwnerUniqueEventKey('skillApplyModifiersChat'),
            classPath.getOwnerEventKey()
        );
    }

    /**
     * @param {Object} chatConfig
     * @param {Object} classPath
     * @param {Object} chatManager
     */
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
                let client = this.fetchOwnerClient(classPath);
                if(!client){
                    return;
                }
                await PlayerDodgeCallback.sendMessage({skill, client, chatManager});
            },
            classPath.getOwnerUniqueEventKey('skillDodgeChat'),
            classPath.getOwnerEventKey()
        );
    }

    /**
     * @param {Object} classPath
     * @returns {Object|false}
     */
    static fetchOwnerClient(classPath)
    {
        let ownerClient = classPath.owner?.skillsServer?.client?.client;
        if(!ownerClient){
            Logger.info('Skill chat message skipped, the owner "'+classPath.getOwnerEventKey()+'" left the room.');
            return false;
        }
        return ownerClient;
    }

}

module.exports.PlayerSkills = PlayerSkills;
