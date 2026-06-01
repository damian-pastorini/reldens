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
            mapCentered: element.mapCentered || 0,
            layers: element.layers
        };
    }

    resolveGeneratorTypeFromRow(row)
    {
        return row?.querySelector('.tileset-generator-type')?.value || SharedUtils.DEFAULT_GENERATOR_TYPE;
    }

    resolveMapFieldFromRow(row, selector, fallback)
    {
        return row ? (row.querySelector(selector).value || fallback) : fallback;
    }

    collectSelectedElements(tileset, selectedOnly)
    {
        let elements = [];
        for(let element of tileset.elements){
            if(selectedOnly && !element.bulkSelected){
                continue;
            }
            elements.push(this.serializeElement(element));
        }
        return elements;
    }

    collectSelectedSpots(tileset, selectedOnly)
    {
        let spots = [];
        for(let spot of (tileset.spots || [])){
            if(selectedOnly && !spot.bulkSelected){
                continue;
            }
            spots.push(spot);
        }
        return spots;
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
        serialized.generatorType = this.resolveGeneratorTypeFromRow(row);
        serialized.associationsProperties = row ? this.app.strategyEditor.readAssociationsProperties(row) : null;
        serialized.tileOptions = tileset.tileOptions || null;
        serialized.spots = this.collectSelectedSpots(tileset, selectedOnly);
        serialized.collapsed = Boolean(tileset.collapsed);
        serialized.elements = this.collectSelectedElements(tileset, selectedOnly);
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
