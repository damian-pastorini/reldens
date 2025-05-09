/**
 *
 * Reldens - LevelsSetEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class LevelsSetEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {},
            [titleProperty]: {},
            autoFillRanges: {
                type: 'boolean',
                isRequired: true
            },
            autoFillExperienceMultiplier: {
                type: 'number'
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps,
            navigationPosition: 100
        };
    }

}

module.exports.LevelsSetEntity = LevelsSetEntity;
