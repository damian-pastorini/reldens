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
                reference: 'skills_class_path'
            },
            level_id: {
                type: 'reference',
                reference: 'skills_levels'
            },
            animationData: {
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('animationData'), 1);
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

module.exports.LevelUpAnimationsEntity = LevelUpAnimationsEntity;
