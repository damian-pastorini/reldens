/**
 *
 * Reldens - OwnersClassPathEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class OwnersClassPathEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path'
            },
            owner_id: {
                type: 'reference',
                reference: 'players'
            },
            currentLevel: {},
            currentExp: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

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

module.exports.OwnersClassPathEntity = OwnersClassPathEntity;
