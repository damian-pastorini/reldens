/**
 *
 * Reldens - EventListeners
 *
 * Manages event listeners for skill casting and movement blocking.
 *
 */

const { SkillsEvents } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class EventListeners
{

    /**
     * @param {Object} props
     * @param {Object} props.classPath
     * @param {EventsManager} props.events
     * @param {Object} props.actionsPlugin
     * @returns {Promise<void>}
     */
    static async attachCastMovementEvents(props)
    {
        let {classPath, events, actionsPlugin} = props;
        if(!classPath || !events || !actionsPlugin){
            Logger.critical('EventListeners: classPath, events or actionsPlugin undefined.', props);
            return;
        }
        let ownerId = classPath.getOwnerEventKey();
        classPath.listenEvent(
            SkillsEvents.SKILL_BEFORE_CAST,
            async (skill) => {
                if(this.validateSkillData(skill)){
                    return;
                }
                skill.owner.physicalBody.isBlocked = true;
            },
            classPath.getOwnerUniqueEventKey('skillBeforeCastPack'),
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
            classPath.getOwnerUniqueEventKey('skillAfterCastPack'),
            ownerId
        );
        await events.emit('reldens.actionsPrepareEventsListeners', actionsPlugin, classPath);
    }

    /**
     * @param {Object} skill
     * @returns {boolean}
     */
    static validateSkillData(skill)
    {
        let customDataJson = sc.toJson(skill.customData);
        return !customDataJson
            || !sc.get(customDataJson, 'blockMovement', false)
            || !sc.hasOwn(skill.owner, 'physicalBody');
    }

}

module.exports.EventListeners = EventListeners;
