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

    resolveConvertName(tilesetIndex, index, name) // HOFF
    {
        return ElementNameSuffix.resolveUnique(
            this.collectExistingNames(tilesetIndex, index),
            name.startsWith('cluster-') ? 'element-'+SharedUtils.padNum(this.countAllElements() + 1) : name
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
