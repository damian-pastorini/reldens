/**
 *
 * Reldens - SkillDataFactory
 *
 * Factory for creating and validating skill data structures.
 *
 */

const { SkillSchema } = require('../schemas/skill-schema');
const { SchemaValidator, sc, Logger} = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').SchemaValidator} SchemaValidator
 */
class SkillDataFactory
{

    constructor()
    {
        /** @type {number|null} */
        this.id = null;
        /** @type {string|null} */
        this.key = null;
        /** @type {string|null} */
        this.type = null;
        /** @type {boolean|null} */
        this.autoValidation = null;
        /** @type {number|null} */
        this.skillDelay = null;
        /** @type {number|null} */
        this.castTime = null;
        /** @type {number|null} */
        this.usesLimit = null;
        /** @type {number|null} */
        this.range = null;
        /** @type {boolean|null} */
        this.rangeAutomaticValidation = null;
        /** @type {string|null} */
        this.rangePropertyX = null;
        /** @type {string|null} */
        this.rangePropertyY = null;
        /** @type {string|null} */
        this.rangeTargetPropertyX = null;
        /** @type {string|null} */
        this.rangeTargetPropertyY = null;
        /** @type {boolean|null} */
        this.allowSelfTarget = null;
        /** @type {number|null} */
        this.criticalChance = null;
        /** @type {number|null} */
        this.criticalMultiplier = null;
        /** @type {number|null} */
        this.criticalFixedValue = null;
        /** @type {Object|null} */
        this.customData = null;
        /** @type {Array<Object>} */
        this.classPaths = [];
        /** @type {Array<Object>} */
        this.objects = [];
        /** @type {Array<Object>} */
        this.animations = [];
        /** @type {Object|null} */
        this.attack = null;
        /** @type {Object|null} */
        this.physicalData = null;
        /** @type {Array<Object>} */
        this.targetEffects = [];
        /** @type {Array<Object>} */
        this.ownerEffects = [];
        /** @type {Array<Object>} */
        this.ownerConditions = [];
        /** @type {Array<string>} */
        this.clearPrevious = [];
        /** @type {Object} */
        this.schema = SkillSchema;
        /** @type {SchemaValidator} */
        this.schemaValidator = new SchemaValidator(this.schema);
    }

    /**
     * @returns {boolean}
     */
    isValid()
    {
        return this.schemaValidator.validate(this);
    }

    /**
     * @param {string} key
     * @param {Object} data
     * @param {Object} defaults
     * @returns {SkillDataFactory}
     */
    mapData(key, data, defaults)
    {
        Object.assign(this, {key}, sc.get(defaults, 'properties', {}), sc.get(data, 'properties', {}));
        this.clearPrevious = sc.get(data, 'clearPrevious', []);
        let skillType = sc.get(data.typeData, 'key', false);
        if(skillType){
            let typeDefaults = sc.get(defaults, skillType, {});
            this[skillType] = Object.assign({}, typeDefaults, sc.get(data.typeData, 'properties', {}));
        }
        let physicalData = sc.get(data, 'physicalData', false);
        if(physicalData){
            this.physicalData = Object.assign({}, sc.get(defaults, 'physicalData', {}), physicalData);
        }
        this.mapTargetEffects(data, defaults);
        this.mapOwnerEffects(data, defaults);
        this.mapOwnerConditions(data, defaults);
        this.mapClassPaths(data, defaults);
        this.mapObjects(data, defaults);
        this.mapAnimations(key, data, defaults);
        return this;
    }

    /**
     * @param {Object} data
     * @param {Object} defaults
     */
    mapClassPaths(data, defaults)
    {
        let classPathsKeys = Object.keys(defaults.classPaths);
        if(0 === classPathsKeys.length){
            return;
        }
        let relatedClassPaths = sc.get(data, 'classPathLevelRelations', {});
        let relatedClassPathsKeys = Object.keys(relatedClassPaths);
        let relateAll = -1 !== relatedClassPathsKeys.indexOf('all');
        let loopClassPaths = relateAll ? Object.keys(defaults.classPaths) : relatedClassPathsKeys;
        for(let i of loopClassPaths){
            let existentClassPath = defaults.classPaths[i];
            if(!existentClassPath){
                Logger.warning('Class path not found: "'+i+'".');
                continue;
            }
            let loopIndex = relateAll ? 'all' : i;
            let relatedClassPathLevel = existentClassPath.relatedLevels[relatedClassPaths[loopIndex]];
            if(!relatedClassPathLevel){
                Logger.warning('Level "'+relatedClassPaths[i]+'" not found in class path: "'+loopIndex+'".');
                continue;
            }
            this.classPaths.push({class_path_id: existentClassPath.id, level_id: relatedClassPathLevel.id});
        }
    }

    /**
     * @param {Object} data
     * @param {Object} defaults
     */
    mapObjects(data, defaults)
    {
        let objectsRelations = sc.get(data, 'objectsRelations', {});
        let objectsRelationsKeys = Object.keys(objectsRelations);
        if(0 === objectsRelationsKeys.length){
            return;
        }
        for(let i of objectsRelationsKeys){
            this.objects.push({objectKey: i, target_id: defaults.targetOptions[objectsRelations[i]].id});
        }
    }

    /**
     * @param {string} key
     * @param {Object} data
     * @param {Object} defaults
     */
    mapAnimations(key, data, defaults)
    {
        let animations = sc.get(data, 'animations', {});
        let animationKeys = Object.keys(animations);
        if(0 === animationKeys.length){
            return;
        }
        let animationsDefaults = sc.get(defaults, 'animations', {});
        let animationDefaultData = animationsDefaults.defaults;
        for(let i of animationKeys){
            let animationData = Object.assign({}, animationDefaultData, animationsDefaults[i], animations[i]);
            if(animationsDefaults.appendSkillKeyOnAnimationImage || animations[i].appendSkillKeyOnAnimationImage){
                animationData.img = key + animationData.img;
            }
            this.animations.push({key: i, animationData});
        }
    }

    /**
     * @param {Object} data
     * @param {Object} defaults
     */
    mapOwnerConditions(data, defaults)
    {
        let ownerConditions = sc.get(data, 'ownerConditions', []);
        if(0 === ownerConditions.length){
            return;
        }
        for(let ownerCondition of ownerConditions){
            this.ownerConditions.push(
                Object.assign(
                    {},
                    sc.get(defaults, 'ownerConditions', {}),
                    ownerCondition,
                    {property_key: ownerCondition.propertyKey}
                )
            );
        }
    }

    /**
     * @param {Object} data
     * @param {Object} defaults
     */
    mapOwnerEffects(data, defaults)
    {
        let ownerEffects = sc.get(data, 'ownerEffects', []);
        if(0 === ownerEffects.length){
            return;
        }
        for(let ownerEffect of ownerEffects){
            this.ownerEffects.push(
                Object.assign(
                    {},
                    sc.get(defaults, 'ownerEffects', {}),
                    ownerEffect,
                    {property_key: ownerEffect.propertyKey}
                )
            );
        }
    }

    /**
     * @param {Object} data
     * @param {Object} defaults
     */
    mapTargetEffects(data, defaults)
    {
        let targetEffects = sc.get(data, 'targetEffects', []);
        if(0 === targetEffects.length){
            return;
        }
        for(let targetEffect of targetEffects){
            this.targetEffects.push(
                Object.assign(
                    {},
                    sc.get(defaults, 'targetEffects', {}),
                    targetEffect,
                    {property_key: targetEffect.propertyKey}
                )
            );
        }
    }

    /**
     * @returns {Object}
     */
    skillBaseData()
    {
        return {
            key: this.key,
            type: this.type,
            autoValidation: this.autoValidation,
            skillDelay: this.skillDelay,
            castTime: this.castTime,
            usesLimit: this.usesLimit,
            range: this.range,
            rangeAutomaticValidation: this.rangeAutomaticValidation,
            rangePropertyX: this.rangePropertyX,
            rangePropertyY: this.rangePropertyY,
            rangeTargetPropertyX: this.rangeTargetPropertyX,
            rangeTargetPropertyY: this.rangeTargetPropertyY,
            allowSelfTarget: this.allowSelfTarget,
            criticalChance: this.criticalChance,
            criticalMultiplier: this.criticalMultiplier,
            criticalFixedValue: this.criticalFixedValue,
            customData: this.customData
        };
    }

}

module.exports.SkillDataFactory = SkillDataFactory;
