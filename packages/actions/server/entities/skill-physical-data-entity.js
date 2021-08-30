/**
 *
 * Reldens - SkillPhysicalDataEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class SkillPhysicalDataEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill'
            },
            magnitude: {},
            objectWidth: {},
            objectHeight: {},
            validateTargetOnHit: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

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

module.exports.SkillPhysicalDataEntity = SkillPhysicalDataEntity;
