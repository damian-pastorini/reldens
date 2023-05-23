/**
 *
 * Reldens - EventListeners
 *
 */

const { SkillsEvents } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class EventListeners
{
    
    static async attachCastMovementEvents(props)
    {
        let {classPath, events, actionsPlugin} = props;
        let ownerId = classPath.getOwnerEventKey();
        classPath.listenEvent(
            SkillsEvents.SKILL_BEFORE_CAST,
            async (skill) => {
                if(this.validateSkillData(skill)){
                    return;
                }
                skill.owner.physicalBody.isBlocked = true;
            },
            'skillBeforeCastPack',
            ownerId
        );
        classPath.listenEvent(
            SkillsEvents.SKILL_AFTER_CAST,
            async (skill) => {
                if(this.validateSkillData(skill)){
                    return;
                }
                skill.owner.physicalBody.isBlocked = false;
            },
            'skillAfterCastPack',
            ownerId
        );
        await events.emit('reldens.actionsPrepareEventsListeners', actionsPlugin, classPath);
    }


    static validateSkillData(skill)
    {
        let customDataJson = sc.toJson(skill.customData);
        return !customDataJson
            || !sc.get(customDataJson, 'blockMovement', false)
            || !sc.hasOwn(skill.owner, 'physicalBody');
    }

}

module.exports.EventListeners = EventListeners;
