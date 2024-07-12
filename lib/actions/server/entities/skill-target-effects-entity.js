/**
 *
 * Reldens - SkillTargetEffectsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class SkillTargetEffectsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                alias: 'parent_skill',
                isRequired: true
            },
            [titleProperty]: {
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

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties = sc.removeFromArray(listProperties, [
            'minValue',
            'maxValue',
            'minProperty',
            'maxProperty'
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

module.exports.SkillTargetEffectsEntity = SkillTargetEffectsEntity;
