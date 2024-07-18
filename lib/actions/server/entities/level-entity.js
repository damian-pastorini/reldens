/**
 *
 * Reldens - LevelEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class LevelEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            required_experience: {
                type: 'number',
                isRequired: true
            },
            level_set_id: {
                type: 'reference',
                reference: 'skills_levels_set',
                alias: 'level_set',
                isRequired: true
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
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.LevelEntity = LevelEntity;
