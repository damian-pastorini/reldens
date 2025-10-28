/**
 *
 * Reldens - DropsAnimationsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class DropsAnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            item_id: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true,
                dbType: 'int'
            },
            asset_type: {
                dbType: 'varchar'
            },
            asset_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            file: {
                isRequired: true,
                dbType: 'varchar'
            },
            extra_params: {
                type: 'textarea',
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('extra_params'), 1);
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.DropsAnimationsEntity = DropsAnimationsEntity;
