/**
 *
 * Reldens - SkillsSkillAnimationsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsSkillAnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {
                dbType: 'int'
            },
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            classKey: {
                dbType: 'varchar'
            },
            animationData: {
                type: 'textarea',
                isRequired: true,
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('animationData'), 1);
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

module.exports.SkillsSkillAnimationsEntity = SkillsSkillAnimationsEntity;
