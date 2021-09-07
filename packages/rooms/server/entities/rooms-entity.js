/**
 *
 * Reldens - RoomsEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class RoomsEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            name: {
                isTitle: true,
                isRequired: true
            },
            title: {
                isRequired: true
            },
            map_filename: {
                isRequired: true
            },
            scene_images: {
                isRequired: true
            },
            room_class_key: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'scene_images',
            'room_class_key'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.RoomsEntity = RoomsEntity;
