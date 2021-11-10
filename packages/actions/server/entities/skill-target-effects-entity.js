/**
 *
 * Reldens - SkillTargetEffectsEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class SkillTargetEffectsEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                isRequired: true
            },
            key: {
                isTitle: true,
                isRequired: true
            },
            property_key: {
                isRequired: true
            },
            operation: {
                availableValues: [
                    {value: 1, label: 'Increment'},
                    {value: 2, label: 'Decrease'},
                    {value: 3, label: 'Divide'},
                    {value: 4, label: 'Multiply'},
                    {value: 5, label: 'Increment Percentage'},
                    {value: 6, label: 'Decrease Percentage'},
                    {value: 7, label: 'Set'},
                    {value: 8, label: 'Method'},
                    {value: 9, label: 'Set Number'}
                ],
                isRequired: true
            },
            value: {
                isRequired: true
            },
            minValue: {
                isRequired: true
            },
            maxValue: {
                isRequired: true
            },
            minProperty: {},
            maxProperty: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'minValue',
            'maxValue',
            'minProperty',
            'maxProperty'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.SkillTargetEffectsEntity = SkillTargetEffectsEntity;
