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

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, ['description', 'customData']);
        editProperties.splice(editProperties.indexOf('id'), 1);

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

module.exports.StatsEntity = StatsEntity;
