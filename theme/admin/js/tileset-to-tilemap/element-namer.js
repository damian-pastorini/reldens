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
        let nameTaken = false;
        let maxSuffix = 1;
        let prefix = name+'-';
        for(let i = 0; i < elements.length; i++){
            if(i === excludeIndex){
                continue;
            }
            if(elements[i].name === name){
                nameTaken = true;
            }
            if(elements[i].name.startsWith(prefix)){
                let suffix = Number(elements[i].name.slice(prefix.length));
                if(suffix > maxSuffix){
                    maxSuffix = suffix;
                }
            }
        }
        if(!nameTaken){
            return name;
        }
        return name+'-'+SharedUtils.padNum(maxSuffix + 1);
    }
}
window.TilesetElementNamer = TilesetElementNamer;
