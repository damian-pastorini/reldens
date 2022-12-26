/**
 *
 * Reldens - PlayerSkills
 *
 */

const { SkillsEvents } = require('@reldens/skills');
const { PlayerDamageCallback } = require('../messages/player-damage-callback');

class PlayerSkills
{

    static listenEvents(classPath, chatConfig, chatManager)
    {
        this.listenDamageEvent(chatConfig, classPath, chatManager);
    }

    static listenDamageEvent(chatConfig, classPath, chatManager)
    {
        if(!chatConfig.damageMessages){
            return;
        }
        classPath.listenEvent(
            SkillsEvents.SKILL_ATTACK_APPLY_DAMAGE,
            async (skill, target, damage) => {
                await PlayerDamageCallback.sendMessage({
                    skill,
                    target,
                    damage,
                    client: classPath.owner.skillsServer.client.client,
                    chatManager: chatManager
                });
            },
            'skillAttackApplyDamageChat',
            classPath.owner[classPath.ownerIdProperty]
        );
    }
}

module.exports.PlayerSkills = PlayerSkills;
