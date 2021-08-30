/**
 *
 * Reldens - SkillGroupsEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class SkillGroupsEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                isTitle: true,
            },
            label: {},
            description: {},
            sort: {}
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

module.exports.SkillGroupsEntity = SkillGroupsEntity;
