/**
 *
 * Reldens - AdsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class AdsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            provider_id: {
                type: 'reference',
                reference: 'ads_providers',
                isRequired: true
            },
            ads_type: {
                type: 'reference',
                reference: 'ads_types',
                isRequired: true
            },
            width: {
                isRequired: true,
                type: 'number'
            },
            height: {
                isRequired: true,
                type: 'number'
            },
            position_top: {
                type: 'number'
            },
            position_bottom: {
                type: 'number'
            },
            position_left: {
                type: 'number'
            },
            position_right: {
                type: 'number'
            },
            enabled: {
                type: 'boolean'
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, [
            'position_top',
            'position_bottom',
            'position_left',
            'position_right'
        ]);
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps,
            navigationPosition: 1200
        };
    }

}

module.exports.AdsEntity = AdsEntity;
