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
            type_id: {
                type: 'reference',
                reference: 'ads_types',
                isRequired: true
            },
            width: {
                type: 'number'
            },
            height: {
                type: 'number'
            },
            position: {},
            top: {
                type: 'number'
            },
            bottom: {
                type: 'number'
            },
            left: {
                type: 'number'
            },
            right: {
                type: 'number'
            },
            replay: {
                type: 'number'
            },
            enabled: {
                type: 'boolean'
            },
            created_at: {
                type: 'datetime'
            },
            updated_at: {
                type: 'datetime'
            }
        };
        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        let listProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, [
            'top',
            'bottom',
            'left',
            'right'
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
