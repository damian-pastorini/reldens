/**
 *
 * Reldens - ClanLevelsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClanLevelsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {},
            key: {
                type: 'number',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            required_experience: {
                type: 'number',
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

module.exports.ClanLevelsEntity = ClanLevelsEntity;
