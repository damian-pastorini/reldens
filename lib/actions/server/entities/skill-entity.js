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
            label: {},
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
            customData: {},
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
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
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps,
            navigationPosition: 200
        };
    }

}

module.exports.SkillEntity = SkillEntity;
