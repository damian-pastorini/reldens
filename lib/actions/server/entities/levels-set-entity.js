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

module.exports.LevelsSetEntity = LevelsSetEntity;
