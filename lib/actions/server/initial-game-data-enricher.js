/**
 *
 * Reldens - InitialGameDataEnricher
 *
 */

class InitialGameDataEnricher
{

    constructor()
    {
        this.classesData = false;
    }

    async withClassPathLabels(roomGame, superInitialGameData)
    {
        if(!roomGame.config.skills.classPaths.classPathsByKey){
            return;
        }
        if(!this.classesData){
            let classPathsLabelsByKey = {};
            for(let i of Object.keys(roomGame.config.skills.classPaths.classPathsByKey)){
                let classPath = roomGame.config.skills.classPaths.classPathsByKey[i];
                classPathsLabelsByKey[classPath.data.id] = {key: i, label: classPath.data.label};
            }
            this.classesData = classPathsLabelsByKey;
        }
        superInitialGameData.classesData = this.classesData;
    }

}

module.exports.InitialGameDataEnricher = InitialGameDataEnricher;
