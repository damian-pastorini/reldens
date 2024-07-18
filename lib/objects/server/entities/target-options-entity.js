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

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.TargetOptionsEntity = TargetOptionsEntity;
