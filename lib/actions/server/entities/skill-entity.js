/**
 *
 * Reldens - SkillEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class SkillEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            type: {
                type: 'reference',
                reference: 'skills_skill_type',
                isRequired: true
            },
            autoValidation: {
                type: 'boolean',
                isRequired: true
            },
            skillDelay: {
                type: 'number',
                isRequired: true
            },
            castTime: {
                type: 'number',
                isRequired: true
            },
            usesLimit: {
                type: 'number',
                isRequired: true
            },
            range: {
                type: 'number',
                isRequired: true
            },
            rangeAutomaticValidation: {
                type: 'boolean',
                isRequired: true
            },
            rangePropertyX: {
                isRequired: true
            },
            rangePropertyY: {
                isRequired: true
            },
            rangeTargetPropertyX: {},
            rangeTargetPropertyY: {},
            allowSelfTarget: {
                type: 'boolean',
                isRequired: true
            },
            criticalChance: {
                type: 'number'
            },
            criticalMultiplier: {
                type: 'number'
            },
            criticalFixedValue: {
                type: 'number'
            },
            customData: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'autoValidation',
            'rangeAutomaticValidation',
            'rangePropertyX',
            'rangePropertyY',
            'rangeTargetPropertyX',
            'rangeTargetPropertyY',
            'allowSelfTarget',
            'criticalChance',
            'criticalMultiplier',
            'criticalFixedValue',
            'customData'
        ]);

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.SkillEntity = SkillEntity;
