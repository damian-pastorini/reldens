(function(){
    let objectsSampleData = {
        "objects": [
            {
                "clientKey": "enemy_forest_1",
                "title": "Tree",
                "privateParams": "{\"shouldRespawn\":true,\"childObjectType\":4,\"isAggressive\":true,\"interactionRadio\":120}",
                "assets": [
                    {
                        "assetType": "spritesheet",
                        "assetKey": "enemy_forest_1",
                        "assetFile": "monster-treant.png",
                        "extraParams": "{\"frameWidth\":47,\"frameHeight\":50}"
                    }
                ]
            },
            {
                "clientKey": "enemy_forest_2",
                "title": "Tree Punch",
                "privateParams": "{\"shouldRespawn\":true,\"childObjectType\":4,\"isAggressive\":true,\"interactionRadio\":70}",
                "assets": [
                    {
                        "assetType": "spritesheet",
                        "assetKey": "enemy_forest_2",
                        "assetFile": "monster-golem2.png",
                        "extraParams": "{\"frameWidth\":47,\"frameHeight\":50}"
                    }
                ]
            }
        ],
        "defaults": {
            "classType": 7,
            "layer": "ground-respawn-area",
            "clientParams": "{\"autoStart\":true}",
            "enabled": 1,
            "respawn": {
                "respawnTime": 2000,
                "instancesLimit": 200
            },
            "stats": {
                "hp": 50,
                "mp": 50,
                "atk": 50,
                "def": 50,
                "dodge": 50,
                "speed": 50,
                "aim": 50,
                "stamina": 50,
                "mgk-atk": 50,
                "mgk-def": 50
            },
            "roomsNames": [
                "bots-001","bots-002","bots-003","bots-004","bots-005",
                "bots-006","bots-007","bots-008","bots-009","bots-010",
                "bots-011","bots-012","bots-013","bots-014","bots-015",
                "bots-016","bots-017","bots-018","bots-019","bots-020",
                "bots-021","bots-022","bots-023","bots-024","bots-025",
                "bots-026","bots-027","bots-028","bots-029","bots-030",
                "bots-031","bots-032","bots-033","bots-034","bots-035",
                "bots-036","bots-037","bots-038","bots-039","bots-040",
                "bots-041","bots-042","bots-043","bots-044","bots-045",
                "bots-046","bots-047","bots-048","bots-049","bots-050"
            ]
        }
    };
    let sampleDataElement = document.querySelector('.objects-import .set-sample-data');
    let generatorDataElement = document.querySelector('.objects-import .generatorData');
    if(sampleDataElement && generatorDataElement){
        sampleDataElement.addEventListener('click', function(){
            generatorDataElement.value = JSON.stringify(objectsSampleData);
        });
    }
    let checkSampleBtn = document.querySelector('.objects-import .check-sample-btn');
    let objectsSampleModal = document.querySelector('#objects-sample-modal');
    let sampleDataDisplay = document.querySelector('#objects-sample-modal .sample-data-display');
    if(checkSampleBtn && objectsSampleModal && sampleDataDisplay){
        checkSampleBtn.addEventListener('click', function(){
            sampleDataDisplay.value = JSON.stringify(objectsSampleData, null, 2);
            objectsSampleModal.classList.remove('hidden');
        });
    }
})();
