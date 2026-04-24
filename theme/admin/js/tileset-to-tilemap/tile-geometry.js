class TileGeometry
{
    getTilePosition(tileset, tile)
    {
        return {
            x: tileset.margin + tile[1] * (tileset.tileWidth + tileset.spacing),
            y: tileset.margin + tile[0] * (tileset.tileHeight + tileset.spacing)
        };
    }
}
