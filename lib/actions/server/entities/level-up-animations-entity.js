/**
 *
 * Reldens - LevelUpAnimationsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class LevelUpAnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path',
                alias: 'class_path',
            },
            level_id: {
                type: 'reference',
                reference: 'skills_levels',
                alias: 'level',
            },
            animationData: {
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties.splice(listProperties.indexOf('animationData'), 1);
        editProperties.splice(editProperties.indexOf('id'), 1);

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

module.exports.LevelUpAnimationsEntity = LevelUpAnimationsEntity;
