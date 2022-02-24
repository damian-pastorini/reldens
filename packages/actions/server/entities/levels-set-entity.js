/**
 *
 * Reldens - LevelsSetEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class LevelsSetEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            autoFillRanges: {
                type: 'boolean',
                isRequired: true
            },
            autoFillExperienceMultiplier: {
                type: 'boolean'
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

module.exports.LevelsSetEntity = LevelsSetEntity;
