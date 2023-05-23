/**
 *
 * Reldens - InitialGameDataEnricher
 *
 */

class InitialGameDataEnricher
{

    static async withClassPathLabels(roomGame, superInitialGameData)
    {
        if(!roomGame.config.skills.classPaths.classPathsByKey){
            return;
        }
        let classPathsLabelsByKey = {};
        for(let i of Object.keys(roomGame.config.skills.classPaths.classPathsByKey)){
            let classPath = roomGame.config.skills.classPaths.classPathsByKey[i];
            classPathsLabelsByKey[classPath.data.id] = {key: i, label: classPath.data.label};
        }
        superInitialGameData.classesData = classPathsLabelsByKey;
    }

}

module.exports.InitialGameDataEnricher = InitialGameDataEnricher;
