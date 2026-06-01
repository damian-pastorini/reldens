class TilesetElementNamer
{
    constructor(app)
    {
        this.app = app;
    }

    countElementsInTileset(ts)
    {
        let count = 0;
        for(let element of ts.elements){
            if(SharedUtils.ELEMENT_TYPE === element.type){
                count++;
            }
        }
        return count;
    }

    resolveConvertName(tilesetIndex, index, name)
    {
        if(!name.startsWith('cluster-')){
            return this.resolveUniqueName(tilesetIndex, index, name);
        }
        let elementCount = 0;
        for(let ts of this.app.state){
            elementCount += this.countElementsInTileset(ts);
        }
        return this.resolveUniqueName(
            tilesetIndex, index, 'element-'+SharedUtils.padNum(elementCount + 1)
        );
    }

    resolveUniqueName(tilesetIndex, excludeIndex, name)
    {
        let elements = this.app.state[tilesetIndex].elements;
        let existingNames = [];
        for(let i = 0; i < elements.length; i++){
            if(i === excludeIndex){
                continue;
            }
            existingNames.push(elements[i].name);
        }
        return ElementNameSuffix.resolveUnique(existingNames, name);
    }
}
window.TilesetElementNamer = TilesetElementNamer;
