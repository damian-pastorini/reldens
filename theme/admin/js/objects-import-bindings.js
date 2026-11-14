class ObjectsImportBindings
{
    constructor()
    {
        this.sampleData = this.buildSampleData();
        this.bind();
    }

    buildSampleData()
    {
        return {
            'objects': [
                {
                    'clientKey': 'enemy_forest_1',
                    'title': 'Tree',
                    'privateParams': '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":120}',
                    'assets': [
                        {
                            'assetType': 'spritesheet',
                            'assetKey': 'enemy_forest_1',
                            'assetFile': 'monster-treant.png',
                            'extraParams': '{"frameWidth":47,"frameHeight":50}'
                        }
                    ]
                },
                {
                    'clientKey': 'enemy_forest_2',
                    'title': 'Tree Punch',
                    'privateParams': '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":70}',
                    'assets': [
                        {
                            'assetType': 'spritesheet',
                            'assetKey': 'enemy_forest_2',
                            'assetFile': 'monster-golem2.png',
                            'extraParams': '{"frameWidth":47,"frameHeight":50}'
                        }
                    ]
                }
            ],
            'defaults': this.buildDefaults()
        };
    }

    buildDefaults()
    {
        return {
            'classType': 7,
            'layer': 'ground-respawn-area',
            'clientParams': '{"autoStart":true}',
            'enabled': 1,
            'respawn': {'respawnTime': 2000,'instancesLimit': 5},
            'stats': {
                'hp': 50,'mp': 50,'atk': 50,'def': 50,'dodge': 50,
                'speed': 50,'aim': 50,'stamina': 50,'mgk-atk': 50,'mgk-def': 50
            },
            'roomsNames': ['reldens-bots-forest']
        };
    }

    bind()
    {
        let sampleDataElement = document.querySelector('.objects-import .set-sample-data');
        let generatorDataElement = document.querySelector('.objects-import .generatorData');
        if(sampleDataElement && generatorDataElement){
            sampleDataElement.addEventListener('click', () => {
                generatorDataElement.value = JSON.stringify(this.sampleData);
            });
        }
        let checkSampleBtn = document.querySelector('.objects-import .check-sample-btn');
        let objectsSampleModal = document.querySelector('#objects-sample-modal');
        let sampleDataDisplay = document.querySelector('#objects-sample-modal .sample-data-display');
        if(checkSampleBtn && objectsSampleModal && sampleDataDisplay){
            checkSampleBtn.addEventListener('click', () => {
                sampleDataDisplay.value = JSON.stringify(this.sampleData, null, 2);
                objectsSampleModal.classList.remove('hidden');
            });
        }
    }
}
new ObjectsImportBindings();
