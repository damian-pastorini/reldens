/**
 *
 * Reldens - RoomsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class RoomsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'title';
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            name: {
                isRequired: true,
                dbType: 'varchar'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            map_filename: {
                isRequired: true,
                dbType: 'varchar'
            },
            scene_images: {
                isRequired: true,
                dbType: 'varchar'
            },
            room_class_key: {
                dbType: 'varchar'
            },
            server_url: {
                dbType: 'varchar'
            },
            customData: {
                type: 'textarea',
                dbType: 'text'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('customData'), 1);
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

module.exports.RoomsEntity = RoomsEntity;
