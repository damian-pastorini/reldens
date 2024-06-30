/**
 *
 * Reldens - OperationTypesEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class SkillTypeEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            [titleProperty]: {}
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
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.SkillTypeEntity = SkillTypeEntity;
