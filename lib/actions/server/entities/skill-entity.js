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

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties = sc.removeFromArray(listProperties, [
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
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.SkillEntity = SkillEntity;
