(function(){
    let skillsSampleData = {
        "options": {
            "removeAll": false,
            "override": false,
            "update": true
        },
        "defaults": {
            "properties": {
                "autoValidation": 0,
                "skillDelay": 1500,
                "castTime": 0,
                "usesLimit": 0,
                "range": 0,
                "rangeAutomaticValidation": 1,
                "rangePropertyX": "state/x",
                "rangePropertyY": "state/y",
                "rangeTargetPropertyX": null,
                "rangeTargetPropertyY": null,
                "allowSelfTarget": 0,
                "criticalChance": 0,
                "criticalMultiplier": 1,
                "criticalFixedValue": 0,
                "customData": null
            },
            "animations": {
                "appendSkillKeyOnAnimationImage": true,
                "defaults": {
                    "enabled": true,
                    "type": "spritesheet",
                    "frameWidth": 64,
                    "frameHeight": 70,
                    "start": 0
                },
                "bullet": {"img": "_bullet","end": 3,"repeat": -1,"frameRate": 1,"dir": 3},
                "cast": {"img": "_cast","end": 3,"repeat": -1,"destroyTime": 2000,"depthByPlayer": "above"},
                "hit": {"img": "_hit","end": 4,"repeat": 0,"depthByPlayer": "above"}
            },
            "attack": {
                "affectedProperty": "stats/hp",
                "allowEffectBelowZero": 0,
                "applyDirectDamage": 0,
                "attackProperties": "stats/atk,stats/stamina,stats/speed",
                "defenseProperties": "stats/def,stats/stamina,stats/speed",
                "aimProperties": "stats/aim",
                "dodgeProperties": "stats/dodge",
                "dodgeFullEnabled": 0,
                "dodgeOverAimSuccess": 1,
                "damageAffected": 0,
                "criticalAffected": 0
            },
            "physicalData": {"magnitude": 0,"objectWidth": 0,"objectHeight": 0,"validateTargetOnHit": 0},
            "targetEffects": {"minValue": 0,"maxValue": 0,"minProperty": null,"maxProperty": null},
            "ownerEffects": {"minValue": 0,"maxValue": 0,"minProperty": null,"maxProperty": null}
        },
        "skills": {
            "punch": {
                "classPathLevelRelations": {"all": "1"},
                "objectsRelations": {"enemy_1": "player","enemy_2": "player"},
                "properties": {"skillDelay": 1000,"range": 50,"criticalChance": 10,"criticalMultiplier": 2},
                "typeData": {"key": "attack","properties": {"hitDamage": 3}}
            },
            "throwRock": {
                "classPathLevelRelations": {"all": "2"},
                "objectsRelations": {"enemy_1": "player","enemy_2": "player"},
                "properties": {"skillDelay": 2000,"range": 250,"criticalChance": 10,"criticalMultiplier": 2},
                "typeData": {"key": "physical_attack","properties": {"hitDamage": 5}},
                "physicalData": {"magnitude": 350,"objectWidth": 5,"objectHeight": 5}
            },
            "heal": {
                "classPathLevelRelations": {"sorcerer": "3"},
                "properties": {"skillDelay": 1500,"allowSelfTarget": 1,"castTime": 2000},
                "typeData": {"key": "effect"},
                "animations": {"cast": {},"hit": {}},
                "clearPrevious": ["targetEffects","ownerEffects","ownerConditions"],
                "ownerConditions": [{"key": "available_mp","propertyKey": "stats/mp","conditional": "ge","value": 2}],
                "ownerEffects": [{"key": "dec_mp","propertyKey": "stats/mp","operationKey": "2","value": 2}],
                "targetEffects": [{"key": "heal","propertyKey": "stats/mp","operationKey": "1","value": 5,"maxProperty": "statsBase/hp"}]
            }
        }
    };
    let skillsSampleDataElement = document.querySelector('.skills-import .set-sample-data');
    let skillsGeneratorDataElement = document.querySelector('.skills-import .generatorData');
    if(skillsSampleDataElement && skillsGeneratorDataElement){
        skillsSampleDataElement.addEventListener('click', function(){
            skillsGeneratorDataElement.value = JSON.stringify(skillsSampleData);
        });
    }
    let skillsCheckSampleBtn = document.querySelector('.skills-import .check-sample-btn');
    let skillsSampleModal = document.querySelector('#skills-sample-modal');
    let skillsSampleDataDisplay = document.querySelector('#skills-sample-modal .sample-data-display');
    if(skillsCheckSampleBtn && skillsSampleModal && skillsSampleDataDisplay){
        skillsCheckSampleBtn.addEventListener('click', function(){
            skillsSampleDataDisplay.value = JSON.stringify(skillsSampleData, null, 2);
            skillsSampleModal.classList.remove('hidden');
        });
    }
})();
