/**
 *
 * Reldens - CrudTestData
 *
 */

class CrudTestData
{

    static getValidTestData(entity, testPrefix)
    {
        let timestamp = Date.now();
        let testData = {
            rooms: {
                name: testPrefix+'-room-'+timestamp,
                title: 'Test Room'
            },
            objects: {
                room_id: 4,
                object_class_key: testPrefix+'-object-'+timestamp,
                client_key: 'test',
                title: 'Test Object',
                object_types: '[]',
                objects_stats: '[]'
            },
            skills: {
                key: testPrefix+'-skill-'+timestamp,
                name: 'Test Skill',
                type: 1,
                autoValidation: 1,
                skillDelay: 1000
            },
            items: {
                key: testPrefix+'-item-'+timestamp,
                label: 'Test Item',
                type: 1,
                group_id: 1,
                base_qty: 1
            },
            ads: {
                ads_key: testPrefix+'-ad-'+timestamp,
                enabled: 1,
                provider_id: 1,
                type_id: 1
            },
            audio: {
                audio_key: testPrefix+'-audio-'+timestamp,
                room_id: 4,
                files_name: 'test.mp3',
                category_id: 1,
                enabled: 1
            },
            chat: {
                message: 'test',
                room_id: 4,
                player_id: 1,
                message_time: new Date().toISOString()
            },
            config: {
                scope: 'test',
                path: testPrefix+'.path.'+timestamp,
                value: 'test',
                type: 1
            },
            features: {
                code: testPrefix+'-feature-'+timestamp,
                title: 'Test Feature',
                is_enabled: 1
            },
            respawn: {
                room_id: 4,
                respawn_time: 1000,
                x: 100,
                y: 100
            },
            rewards: {
                key: testPrefix+'-reward-'+timestamp,
                title: 'Test Reward',
                description: 'Test',
                item_key: 'coins',
                item_qty: 1
            },
            snippets: {
                key: testPrefix+'-snippet-'+timestamp,
                value: 'test content'
            },
            teams: {
                key: testPrefix+'-team-'+timestamp,
                title: 'Test Team'
            },
            users: {
                username: testPrefix+'user'+timestamp,
                email: testPrefix+timestamp+'@test.com',
                password: 'password123',
                role_id: 1,
                status: 1
            }
        };
        return testData[entity] || {
            name: testPrefix+'-'+entity+'-'+timestamp
        };
    }

    static getExpectedValidationErrors(entity)
    {
        let errors = {
            rooms: 'saveBadPatchData',
            objects: 'saveBadPatchData',
            skills: 'saveBadPatchData',
            items: 'saveBadPatchData',
            ads: 'saveBadPatchData',
            audio: 'saveBadPatchData',
            chat: 'saveBadPatchData',
            config: 'saveBadPatchData',
            features: 'saveBadPatchData',
            respawn: 'saveBadPatchData',
            rewards: 'saveBadPatchData',
            snippets: 'saveBadPatchData',
            teams: 'saveBadPatchData',
            users: 'saveBadPatchData'
        };
        return errors[entity] || 'saveBadPatchData';
    }

}

module.exports.CrudTestData = CrudTestData;
