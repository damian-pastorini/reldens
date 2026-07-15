class TilesetSerializer
{

    constructor(app)
    {
        this.app = app;
    }

    serializeElement(element)
    {
        return {
            name: element.name,
            type: element.type,
            approved: element.approved,
            colorIndex: element.colorIndex,
            quantity: element.quantity,
            freeSpaceAround: element.freeSpaceAround,
            allowPathsInFreeSpace: element.allowPathsInFreeSpace,
            bulkSelected: element.bulkSelected || false,
            generateSelected: element.generateSelected || false,
            mapCentered: element.mapCentered || 0,
            layers: element.layers
        };
    }

    resolveMapFieldFromRow(row, selector, fallback)
    {
        if(!row){
            return fallback;
        }
        return row.querySelector(selector).value || fallback;
    }

    collectSelected(items, selectedOnly, serialize)
    {
        let result = [];
        for(let item of (items || [])){
            if(selectedOnly && !item.generateSelected){
                continue;
            }
            result.push(serialize ? serialize(item) : item);
        }
        return result;
    }

    serializeTileset(tileset, selectedOnly, tilesetIndex, row)
    {
        let serialized = SharedUtils.copyTilesetFields({}, tileset);
        serialized.filteredTiles = tileset.filteredTiles || [];
        serialized.originalTileWidth = tileset.originalTileWidth;
        serialized.originalTileHeight = tileset.originalTileHeight;
        serialized.resizeOption = tileset.resizeOption || 0;
        serialized.mapName = this.resolveMapFieldFromRow(row, '.tileset-map-name', 'tileset-elements');
        serialized.mapTitle = this.resolveMapFieldFromRow(row, '.tileset-map-title', 'Tileset Elements');
        let generatorTypeValue = row?.querySelector('.tileset-generator-type')?.value;
        serialized.generatorType = generatorTypeValue || SharedUtils.DEFAULT_GENERATOR_TYPE;
        serialized.associationsProperties = row ? this.app.strategyEditor.readAssociationsProperties(row) : null;
        serialized.tileOptions = tileset.tileOptions || null;
        serialized.spots = this.collectSelected(tileset.spots, selectedOnly, null);
        serialized.collapsed = Boolean(tileset.collapsed);
        serialized.legendSort = tileset.legendSort || {by: 'name', ascending: true};
        serialized.legendVisibility = tileset.legendVisibility
            || {showElements: true, showClusters: true, showSpots: true};
        serialized.elements = this.collectSelected(tileset.elements, selectedOnly, (element) => this.serializeElement(element));
        return serialized;
    }

    getSerializableState(selectedOnly)
    {
        let result = [];
        for(let i = 0; i < this.app.state.length; i++){
            let refs = this.app.refs[i];
            result.push(this.serializeTileset(
                this.app.state[i],
                selectedOnly,
                i,
                refs ? refs.row : null
            ));
        }
        return result;
    }

}
window.TilesetSerializer = TilesetSerializer;
