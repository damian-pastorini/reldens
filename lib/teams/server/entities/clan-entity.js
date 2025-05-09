/**
 *
 * Reldens - ClanEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

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
            level: {},
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps,
            navigationPosition: 900
        };
    }

}

module.exports.ClanEntity = ClanEntity;
