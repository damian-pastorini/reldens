class TilesetElementNamer
{
    constructor(app)
    {
        this.app = app;
    }

    countElementsInTileset(tileset)
    {
        let count = 0;
        for(let element of tileset.elements){
            if(SharedUtils.ELEMENT_TYPE === element.type){
                count++;
            }
        }
        return count;
    }

    countAllElements()
    {
        let total = 0;
        for(let tileset of this.app.state){
            total += this.countElementsInTileset(tileset);
        }
        return total;
    }

    resolveConvertName(tilesetIndex, index, name)
    {
        if(!name.startsWith('cluster-')){
            return this.resolveUniqueName(tilesetIndex, index, name);
        }
        return this.resolveUniqueName(
            tilesetIndex,
            index,
            'element-'+SharedUtils.padNum(this.countAllElements() + 1)
        );
    }

    resolveUniqueName(tilesetIndex, excludeIndex, name)
    {
        return ElementNameSuffix.resolveUnique(
            this.collectExistingNames(tilesetIndex, excludeIndex),
            name
        );
    }

    collectExistingNames(tilesetIndex, excludeIndex)
    {
        let existingNames = [];
        let elements = this.app.state[tilesetIndex].elements;
        for(let i = 0; i < elements.length; i++){
            if(i === excludeIndex){
                continue;
            }
            existingNames.push(elements[i].name);
        }
        return existingNames;
    }
}
window.TilesetElementNamer = TilesetElementNamer;
