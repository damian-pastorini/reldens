/**
 *
 * Reldens - ClanEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClanEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'name';
        let properties = {
            id: {},
            owner_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            points: {
                type: 'number'
            },
            level: {}
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

module.exports.ClanEntity = ClanEntity;
