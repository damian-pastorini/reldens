class ElementTilesLayerCanvas
{
    constructor(editor, onCellClick)
    {
        this.editor = editor;
        this.onCellClick = onCellClick;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'element-tiles-layer-canvas';
        this.ctx = this.canvas.getContext('2d');
        this.bounds = null;
        this.tintAlpha = 0.45;
        this.canvas.addEventListener('click', (event) => this.handleClick(event));
    }

    render(layers)
    {
        this.bounds = this.computeExtent(layers);
        let lut = this.editor.painter.ensureTilesetLut(this.editor.mapJson);
        this.canvas.width = this.bounds.width * lut.tileWidth;
        this.canvas.height = this.bounds.height * lut.tileHeight;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for(let layer of layers){
            this.drawLayer(layer, this.bounds, lut);
        }
    }

    computeExtent(layers)
    {
        let extent = {minCol: Number.MAX_SAFE_INTEGER, minRow: Number.MAX_SAFE_INTEGER, maxCol: -1, maxRow: -1};
        for(let layer of layers){
            this.expandExtent(extent, layer.tiles);
        }
        return this.finalizeExtent(extent);
    }

    expandExtent(extent, tiles)
    {
        for(let tile of tiles){
            extent.minCol = Math.min(extent.minCol, tile.col);
            extent.minRow = Math.min(extent.minRow, tile.row);
            extent.maxCol = Math.max(extent.maxCol, tile.col);
            extent.maxRow = Math.max(extent.maxRow, tile.row);
        }
    }

    finalizeExtent(extent)
    {
        if(-1 === extent.maxCol){
            return {col: 0, row: 0, width: 0, height: 0};
        }
        return {
            col: extent.minCol,
            row: extent.minRow,
            width: extent.maxCol - extent.minCol + 1,
            height: extent.maxRow - extent.minRow + 1
        };
    }

    drawLayer(layer, bounds, lut)
    {
        let tileset = this.editor.tileset;
        for(let tile of layer.tiles){
            if(tileset && 0 < lut.columns && 0 < tile.gid){
                this.editor.painter.drawTile(
                    this.ctx,
                    tileset,
                    lut,
                    tile.gid,
                    (tile.col - bounds.col) * lut.tileWidth,
                    (tile.row - bounds.row) * lut.tileHeight
                );
            }
        }
        let tint = this.resolveTintColor(layer.type);
        if('' === tint){
            return;
        }
        this.ctx.save();
        this.ctx.globalAlpha = this.tintAlpha;
        this.ctx.fillStyle = tint;
        this.editor.painter.fillLayerTiles(this.ctx, layer.tiles, -bounds.col, -bounds.row, lut.tileWidth, lut.tileHeight);
        this.ctx.restore();
    }

    resolveTintColor(type)
    {
        let color = this.readLayerColor('layer-color-'+type);
        if('' === color){
            return this.readLayerColor('layer-color-custom');
        }
        return color;
    }

    readLayerColor(className)
    {
        let probe = document.createElement('span');
        probe.className = className;
        this.canvas.parentNode.appendChild(probe);
        let computed = getComputedStyle(probe).backgroundColor;
        probe.remove();
        if('rgba(0, 0, 0, 0)' === computed || 'transparent' === computed){
            return '';
        }
        return computed;
    }

    handleClick(event)
    {
        if(!this.bounds){
            return;
        }
        let lut = this.editor.painter.ensureTilesetLut(this.editor.mapJson);
        let rect = this.canvas.getBoundingClientRect();
        let col = this.bounds.col + Math.floor((event.clientX - rect.left) * (this.canvas.width / rect.width) / lut.tileWidth);
        let row = this.bounds.row + Math.floor((event.clientY - rect.top) * (this.canvas.height / rect.height) / lut.tileHeight);
        this.onCellClick(col, row);
    }
}
window.ElementTilesLayerCanvas = ElementTilesLayerCanvas;
