/**
 *
 * Reldens - ObjectsSkillsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ObjectsStatsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            },
            stat_id: {
                type: 'reference',
                reference: 'stats',
                isRequired: true
            },
            base_value: {
                type: 'number'
            },
            value: {
                type: 'number'
            }
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

module.exports.ObjectsStatsEntity = ObjectsStatsEntity;
