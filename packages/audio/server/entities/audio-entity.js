/**
 *
 * Reldens - AudioEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class AudioEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            audio_key: {
                isTitle: true,
                isRequired: true
            },
            files_name: {
                isRequired: true
            },
            config: {},
            room_id: {
                type: 'reference',
                reference: 'rooms'
            },
            category_id: {
                type: 'reference',
                reference: 'audio_categories'
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'files_name',
            'config'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            /*
            callbacks: {
                find: () => {
                    console.log('find test callback');
                },
                count: () => {
                    console.log('count test callback');
                },
                update: () => {
                    console.log('update test callback');
                }
            }
            */
        }, extraProps);
    }

}

module.exports.AudioEntity = AudioEntity;
