/**
 *
 * Reldens - SkillPhysicalDataEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class SkillPhysicalDataEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                alias: 'parent_skill',
                isRequired: true
            },
            magnitude: {
                type: 'number',
                isRequired: true
            },
            objectWidth: {
                type: 'number',
                isRequired: true
            },
            objectHeight: {
                type: 'number',
                isRequired: true
            },
            validateTargetOnHit: {
                type: 'boolean',
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.SkillPhysicalDataEntity = SkillPhysicalDataEntity;
