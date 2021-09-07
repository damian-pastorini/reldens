/**
 *
 * Reldens - SkillEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class SkillEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                isTitle: true,
                isRequired: true
            },
            type: {
                availableValues: [
                    {value: '1', label: 'Base'},
                    {value: '2', label: 'Attack'},
                    {value: '3', label: 'Effect'},
                    {value: '4', label: 'Physical Attack'},
                    {value: '5', label: 'Physical Effect'}
                ],
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

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.SkillEntity = SkillEntity;
