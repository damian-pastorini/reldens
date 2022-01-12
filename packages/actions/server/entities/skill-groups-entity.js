/**
 *
 * Reldens - SkillGroupsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class SkillGroupsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                isTitle: true,
                isRequired: true
            },
            label: {
                isRequired: true
            },
            description: {
                isRequired: true
            },
            sort: {
                type: 'number',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

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

module.exports.SkillGroupsEntity = SkillGroupsEntity;
