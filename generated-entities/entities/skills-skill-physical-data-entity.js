/**
 *
 * Reldens - SkillsSkillPhysicalDataEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsSkillPhysicalDataEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
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
            magnitude: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            objectWidth: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            objectHeight: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            validateTargetOnHit: {
                type: 'boolean',
                dbType: 'tinyint'
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
            ...extraProps
        };
    }

}

module.exports.SkillsSkillPhysicalDataEntity = SkillsSkillPhysicalDataEntity;
