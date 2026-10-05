class TilesetCanvasTileReadout
{

    constructor(app)
    {
        this.app = app;
    }

    resolveReadoutElement(tilesetIndex)
    {
        let refs = this.app.refs[tilesetIndex];
        if(!refs){
            return null;
        }
        return refs.tileReadout;
    }

    update(event, canvas, tilesetIndex)
    {
        let readout = this.resolveReadoutElement(tilesetIndex);
        if(!readout){
            return;
        }
        let tileset = this.app.state[tilesetIndex];
        let tile = this.app.interaction.tileEditor.getTileFromEvent(event, canvas, tileset);
        if(!tile){
            readout.textContent = '';
            return;
        }
        let flatIndex = tile.row * tileset.tilesetColumns + tile.col;
        readout.textContent = tile.col+', '+tile.row+' ['+flatIndex+']';
    }

    clear(tilesetIndex)
    {
        let readout = this.resolveReadoutElement(tilesetIndex);
        if(readout){
            readout.textContent = '';
        }
    }

}
window.TilesetCanvasTileReadout = TilesetCanvasTileReadout;
