/**
 *
 * Reldens - SkillDataFactory
 *
 */

const { SkillSchema } = require('../schemas/skill-schema');
const { SchemaValidator, sc, Logger} = require('@reldens/utils');

class SkillDataFactory
{

    constructor()
    {
        this.id = null;
        this.key = null;
        this.type = null;
        this.autoValidation = null;
        this.skillDelay = null;
        this.castTime = null;
        this.usesLimit = null;
        this.range = null;
        this.rangeAutomaticValidation = null;
        this.rangePropertyX = null;
        this.rangePropertyY = null;
        this.rangeTargetPropertyX = null;
        this.rangeTargetPropertyY = null;
        this.allowSelfTarget = null;
        this.criticalChance = null;
        this.criticalMultiplier = null;
        this.criticalFixedValue = null;
        this.customData = null;
        this.classPaths = [];
        this.objects = [];
        this.attack = null;
        this.physicalData = null;
        this.targetEffects = [];
        this.ownerEffects = [];
        this.ownerConditions = [];
        this.clearPrevious = [];
        this.schema = SkillSchema;
        this.schemaValidator = new SchemaValidator(this.schema);
    }

    isValid()
    {
        return this.schemaValidator.validate(this);
    }

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
        return this;
    }

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

    mapOwnerConditions(data, defaults)
    {
        let ownerConditions = sc.get(data, 'ownerConditions', []);
        if (0 === ownerConditions.length) {
            return;
        }
        for (let ownerCondition of ownerConditions) {
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

    mapOwnerEffects(data, defaults)
    {
        let ownerEffects = sc.get(data, 'ownerEffects', []);
        if (0 === ownerEffects.length) {
            return;
        }
        for (let ownerEffect of ownerEffects) {
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

    mapTargetEffects(data, defaults)
    {
        let targetEffects = sc.get(data, 'targetEffects', []);
        if (0 === targetEffects.length) {
            return;
        }
        for (let targetEffect of targetEffects) {
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