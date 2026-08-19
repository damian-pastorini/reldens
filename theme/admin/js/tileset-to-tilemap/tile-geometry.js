class TileGeometry
{
    getTilePosition(tileset, tile)
    {
        return {
            x: tileset.margin + tile[1] * (tileset.tileWidth + tileset.spacing),
            y: tileset.margin + tile[0] * (tileset.tileHeight + tileset.spacing)
        };
    }

    flatIndexToTile(tileset, flatIndex)
    {
        return [Math.floor(flatIndex / tileset.tilesetColumns), flatIndex % tileset.tilesetColumns];
    }

    tileToFlatIndex(tileset, tile)
    {
        return tile[0] * tileset.tilesetColumns + tile[1];
    }
}
window.TileGeometry = TileGeometry;
