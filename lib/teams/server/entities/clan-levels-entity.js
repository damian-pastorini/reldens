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
        let properties = {
            id: {},
            key: {
                type: 'number',
                isRequired: true
            },
            label: {
                isRequired: true
            },
            required_experience: {
                type: 'number',
                isRequired: true
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

module.exports.ClanLevelsEntity = ClanLevelsEntity;
