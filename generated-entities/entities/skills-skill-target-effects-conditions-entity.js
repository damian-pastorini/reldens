/**
 *
 * Reldens - SkillsSkillTargetEffectsConditionsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsSkillTargetEffectsConditionsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {
                dbType: 'int'
            },
            skill_target_effect_id: {
                type: 'reference',
                reference: 'skills_skill_target_effects',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            property_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            conditional: {
                availableValues: [
                    {value: 1, label: 'eq'},
                    {value: 2, label: 'ne'},
                    {value: 3, label: 'lt'},
                    {value: 4, label: 'gt'},
                    {value: 5, label: 'le'},
                    {value: 6, label: 'ge'}
                ],
                isRequired: true,
                dbType: 'enum'
            },
            value: {
                isRequired: true,
                dbType: 'varchar'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = propertiesKeys;
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

module.exports.SkillsSkillTargetEffectsConditionsEntity = SkillsSkillTargetEffectsConditionsEntity;
