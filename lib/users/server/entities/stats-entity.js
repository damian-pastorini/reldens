/**
 *
 * Reldens - StatsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class StatsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            description: {
                isRequired: true
            },
            base_value: {
                type: 'number',
                isRequired: true
            },
            customData: {},
        };

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];
        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, ['description', 'customData']);
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

module.exports.StatsEntity = StatsEntity;
