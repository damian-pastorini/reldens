class TilesetAiBulkOperations
{
    constructor(app)
    {
        this.app = app;
    }

    collectBulkSelectedByType(elements, matchClusterFlag)
    {
        let result = [];
        for(let i = 0; i < elements.length; i++){
            if(!elements[i].bulkSelected){
                continue;
            }
            let isCluster = SharedUtils.CLUSTER_TYPE === elements[i].type;
            if(matchClusterFlag !== isCluster){
                continue;
            }
            result.push(i);
        }
        return result;
    }

    async bulkDetectAi(tilesetIndex)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        let triggerButton = this.app.refs[tilesetIndex].bulkDetectBtn;
        let elements = this.app.state[tilesetIndex].elements;
        let selectedClusters = this.collectBulkSelectedByType(elements, true);
        for(let i = selectedClusters.length - 1; i >= 0; i--){
            await this.app.aiElement.runAiDetectSingle(tilesetIndex, selectedClusters[i], provider, triggerButton);
        }
        let updated = this.app.state[tilesetIndex].elements;
        let selectedNonClusters = this.collectBulkSelectedByType(updated, false);
        for(let i of selectedNonClusters){
            await this.app.aiElement.runAiDetectSingle(tilesetIndex, i, provider, triggerButton);
        }
    }

    async bulkNameAi(tilesetIndex)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        let triggerButton = this.app.refs[tilesetIndex].bulkNameBtn;
        let elements = this.app.state[tilesetIndex].elements;
        let selectedNonClusters = this.collectBulkSelectedByType(elements, false);
        for(let i of selectedNonClusters){
            await this.app.aiElement.runAiNameSingle(tilesetIndex, i, provider, triggerButton);
        }
    }
}
window.TilesetAiBulkOperations = TilesetAiBulkOperations;

