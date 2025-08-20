/**
 *
 * Reldens - FeaturesTestData
 *
 */

class FeaturesTestData
{

    static getMapsWizardValidData()
    {
        return {
            mainAction: 'generate',
            mapsWizardAction: 'elements-composite-loader',
            generatorData: JSON.stringify({
                factor: 2,
                mainPathSize: 3,
                blockMapBorder: true,
                freeSpaceTilesQuantity: 2,
                variableTilesPercentage: 15,
                collisionLayersForPaths: ['change-points', 'collisions'],
                compositeElementsFile: 'sample-map.json',
                automaticallyExtrudeMaps: '1'
            })
        };
    }

    static getMapsWizardInvalidData()
    {
        return {
            mainAction: 'generate',
            mapsWizardAction: 'elements-composite-loader',
            generatorData: 'invalid-json'
        };
    }

    static getMapsWizardExpectedError()
    {
        return 'mapsWizardWrongJsonDataError';
    }

    static getObjectsImportValidData()
    {
        let timestamp = Date.now();
        return {
            json: JSON.stringify([
                {
                    room_id: 4,
                    object_class_key: 'imported-object-1-'+timestamp,
                    client_key: 'obj1',
                    title: 'Test Object 1'
                },
                {
                    room_id: 4,
                    object_class_key: 'imported-object-2-'+timestamp,
                    client_key: 'obj2',
                    title: 'Test Object 2'
                }
            ])
        };
    }

    static getObjectsImportInvalidData()
    {
        return {json: 'invalid-json'};
    }

    static getObjectsImportMissingFieldsData()
    {
        return {json: JSON.stringify([{room_id: 4}])};
    }

    static getSkillsImportValidData()
    {
        let timestamp = Date.now();
        return {
            json: JSON.stringify([
                {
                    key: 'imported-skill-1-'+timestamp,
                    name: 'Imported Skill 1',
                    type: 1,
                    autoValidation: 1,
                    skillDelay: 1000
                },
                {
                    key: 'imported-skill-2-'+timestamp,
                    name: 'Imported Skill 2',
                    type: 1,
                    autoValidation: 1,
                    skillDelay: 1000
                }
            ])
        };
    }

    static getServerManagementValidData()
    {
        return {'shutdown-time': 300};
    }

    static getServerManagementInvalidData()
    {
        return {};
    }

    static getServerManagementExpectedError()
    {
        return 'shutdownError';
    }

    static getAudioUploadValidData()
    {
        let timestamp = Date.now();
        let audioKey = 'test-audio-'+timestamp;
        return {
            audio_key: audioKey,
            room_id: 4,
            files_name: audioKey+'.mp3',
            category_id: 1,
            enabled: 1
        };
    }

    static getItemsUploadValidData()
    {
        let timestamp = Date.now();
        return {
            key: 'test-item-'+timestamp,
            label: 'Test Item',
            type: 1,
            group_id: 1,
            base_qty: 1
        };
    }

    static getFileUploadInvalidData()
    {
        return {
            audio_key: '',
            room_id: '',
            files_name: '',
            category_id: '',
            enabled: ''
        };
    }

}

module.exports.FeaturesTestData = FeaturesTestData;
