/**
 *
 * Reldens - Skills - StorageObserver
 *
 * Observes skill events and persists data changes to storage.
 *
 */

const { ModelsManager } = require('./models-manager');
const { SkillsEvents } = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 *
 * @typedef {Object} StorageObserverProps
 * @property {Object} classPath
 * @property {Object} [modelsManagerConfig]
 * @property {BaseDataServer} dataServer
 * @property {ModelsManager} [modelsManager]
 */
class StorageObserver
{

    /**
     * @param {StorageObserverProps} props
     */
    constructor(props)
    {
        /** @type {Object} */
        this.classPath = props.classPath;
        let modelsManagerConfig = sc.get(props, 'modelsManagerConfig', {});
        if(this.classPath.events){
            modelsManagerConfig['events'] = this.classPath.events;
        }
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
        modelsManagerConfig['dataServer'] = this.dataServer;
        /** @type {ModelsManager} */
        this.modelsManager = sc.isTrue(props, 'modelsManager')
            ? props.modelsManager
            : new ModelsManager(modelsManagerConfig);
    }

    /**
     * @returns {boolean|void}
     */
    registerListeners()
    {
        if(!this.classPath){
            Logger.error('Class Path data undefined for Storage Observer.');
            return false;
        }
        if(!this.modelsManager){
            Logger.error('ModelsManager undefined for Skills Storage Observer.');
            return false;
        }
        let ownerEventKey = this.classPath.getOwnerEventKey();
        this.classPath.listenEvent(
            SkillsEvents.LEVEL_UP,
            this.saveLevelUpData.bind(this),
            this.classPath.getOwnerUniqueEventKey('levelUpStorage'),
            ownerEventKey
        );
        this.classPath.listenEvent(
            SkillsEvents.LEVEL_EXPERIENCE_ADDED,
            this.updateExperience.bind(this),
            this.classPath.getOwnerUniqueEventKey('expAddStorage'),
            ownerEventKey
        );
        this.classPath.listenEvent(
            SkillsEvents.SKILL_APPLY_OWNER_EFFECTS,
            this.saveOwnerData.bind(this),
            this.classPath.getOwnerUniqueEventKey('applyOwnerEffectsStorage'),
            ownerEventKey
        );
        this.classPath.listenEvent(
            SkillsEvents.SKILL_EFFECT_TARGET_MODIFIERS,
            this.saveTargetData.bind(this),
            this.classPath.getOwnerUniqueEventKey('applyTargetEffectsStorage'),
            ownerEventKey
        );
    }

    /**
     * @param {Object} skill
     * @returns {Promise<any>}
     */
    async saveTargetData(skill)
    {
        if(!sc.isFunction(skill?.target?.persistData)){
            return false;
        }
        return await skill.target.persistData();
    }

    /**
     * @param {Object} skill
     * @returns {Promise<any>}
     */
    async saveOwnerData(skill)
    {
        return await skill.owner.persistData();
    }

    /**
     * @param {Object} levelsSet
     * @returns {Promise<any>}
     */
    async updateExperience(levelsSet)
    {
        return await this.modelsManager.updateExperience(levelsSet);
    }

    /**
     * @param {Object} levelsSet
     * @returns {Promise<any>}
     */
    async saveLevelUpData(levelsSet)
    {
        await this.modelsManager.updateLevel(levelsSet);
        return await levelsSet.owner.persistData();
    }
}

module.exports.StorageObserver = StorageObserver;
