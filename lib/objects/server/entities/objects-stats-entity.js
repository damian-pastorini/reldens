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

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.ObjectsStatsEntity = ObjectsStatsEntity;
