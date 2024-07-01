/**
 *
 * Reldens - TargetOptionsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class TargetOptionsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'target_key';
        let properties = {
            id: {},
            [titleProperty]: {},
            target_label: {}
        };

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.TargetOptionsEntity = TargetOptionsEntity;
