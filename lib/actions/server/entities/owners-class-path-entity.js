/**
 *
 * Reldens - OwnersClassPathEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class OwnersClassPathEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path',
                isRequired: true,
                alias: 'class_path_owner'
            },
            owner_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            currentLevel: {
                type: 'number',
                isRequired: true
            },
            currentExp: {
                type: 'number',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.OwnersClassPathEntity = OwnersClassPathEntity;
