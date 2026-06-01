class TilesetCanvasInteraction
{
    static DRAG_MODE_ADD = 'add';
    static DRAG_MODE_REMOVE = 'remove';
    static DRAG_MODE_MOVE = 'move';

    constructor(app)
    {
        this.app = app;
        this.tileEditor = new TilesetCanvasTileEditor(app);
    }

    getTileAtIndex(event, tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let canvas = this.app.refs[tilesetIndex].canvas;
        return this.tileEditor.getTileFromEvent(event, canvas, tileset);
    }

    flatIndexFor(tilesetIndex, tile)
    {
        return tile.row * this.app.state[tilesetIndex].tilesetColumns + tile.col;
    }

    beginRightDrag(tilesetIndex, tile)
    {
        this.app.isDragging = true;
        this.app.isRightDrag = true;
        this.app.lastDragTile = this.flatIndexFor(tilesetIndex, tile);
    }

    selectAndScroll(tilesetIndex, tile)
    {
        this.tileEditor.handleTileSelectClick(tilesetIndex, tile.row, tile.col);
        this.app.editor.scroller.scrollLegendToSelected(tilesetIndex);
    }

    getNextDragTile(event, tilesetIndex)
    {
        let tile = this.getTileAtIndex(event, tilesetIndex);
        if(!tile){
            return null;
        }
        let tileKey = this.flatIndexFor(tilesetIndex, tile);
        if(tileKey === this.app.lastDragTile){
            return null;
        }
        this.app.lastDragTile = tileKey;
        return tile;
    }

    handleCanvasMouseDown(event, tilesetIndex)
    {
        if(this.app.runningDetections > 0){
            return;
        }
        event.preventDefault();
        let tile = this.getTileAtIndex(event, tilesetIndex);
        if(!tile){
            return;
        }
        if(
            this.app.tileOptionsBinder
            && null !== this.app.tileOptionsBinder.activeOptionKey
            && (this.app.tileOptionsBinder.activeTilesetIndex === tilesetIndex
                || -1 === this.app.tileOptionsBinder.activeTilesetIndex)
        ){
            this.app.tileOptionsBinder.handleTileClick(tilesetIndex, tile.row, tile.col);
            return;
        }
        if(this.app.mouseButtonRight === event.button){
            if(event.shiftKey){
                this.app.isAreaSelect = true;
                this.app.areaSelectTileset = tilesetIndex;
                this.app.areaSelectStart = tile;
                this.app.areaSelectEnd = tile;
                this.app.isDragging = true;
                this.app.renderer.renderCanvas(tilesetIndex);
                return;
            }
            if(this.app.viewAllMode){
                this.beginRightDrag(tilesetIndex, tile);
                this.tileEditor.handleTileRemoveViewAll(tilesetIndex, tile.row, tile.col);
                return;
            }
            let isRightElementSelected = this.app.selectedTileset === tilesetIndex
                && null !== this.app.selectedElement;
            if(!isRightElementSelected){
                return;
            }
            this.beginRightDrag(tilesetIndex, tile);
            this.tileEditor.handleTileRemoveClick(tilesetIndex, tile.row, tile.col);
            return;
        }
        if(event.shiftKey){
            this.selectAndScroll(tilesetIndex, tile);
            return;
        }
        let isElementSelected = this.app.selectedTileset === tilesetIndex
            && null !== this.app.selectedElement;
        if(!isElementSelected){
            this.selectAndScroll(tilesetIndex, tile);
            return;
        }
        let element = this.app.state[tilesetIndex].elements[this.app.selectedElement];
        let ownerLayerIndex = this.tileEditor.findTileLayerIndex(element, tile.row, tile.col);
        this.app.dragToggleMode = TilesetCanvasInteraction.DRAG_MODE_ADD;
        if(-1 !== ownerLayerIndex){
            let ownerLayer = element.layers[ownerLayerIndex];
            this.app.dragToggleMode = ownerLayer.type === this.app.activeLayerType
                ? TilesetCanvasInteraction.DRAG_MODE_REMOVE
                : TilesetCanvasInteraction.DRAG_MODE_MOVE;
        }
        this.app.isDragging = true;
        this.app.lastDragTile = this.flatIndexFor(tilesetIndex, tile);
        this.tileEditor.handleTileEditClick(tilesetIndex, tile.row, tile.col);
    }

    handleCanvasMouseMove(event, tilesetIndex)
    {
        if(!this.app.isDragging){
            return;
        }
        if(this.app.isAreaSelect && this.app.areaSelectTileset === tilesetIndex){
            let tile = this.getTileAtIndex(event, tilesetIndex);
            if(!tile){
                return;
            }
            this.app.areaSelectEnd = tile;
            this.app.renderer.renderCanvas(tilesetIndex);
            return;
        }
        if(this.app.isRightDrag && this.app.viewAllMode){
            let tile = this.getNextDragTile(event, tilesetIndex);
            if(!tile){
                return;
            }
            this.tileEditor.handleTileRemoveViewAll(tilesetIndex, tile.row, tile.col);
            return;
        }
        if(this.app.selectedTileset !== tilesetIndex){
            return;
        }
        if(null === this.app.selectedElement){
            return;
        }
        let tile = this.getNextDragTile(event, tilesetIndex);
        if(!tile){
            return;
        }
        if(this.app.isRightDrag){
            this.tileEditor.handleTileRemoveClick(tilesetIndex, tile.row, tile.col);
            return;
        }
        let element = this.app.state[tilesetIndex].elements[this.app.selectedElement];
        let ownerLayerIndex = this.tileEditor.findTileLayerIndex(element, tile.row, tile.col);
        let tileExists = -1 !== ownerLayerIndex;
        let shouldProcess = false;
        if(TilesetCanvasInteraction.DRAG_MODE_ADD === this.app.dragToggleMode){
            shouldProcess = !tileExists;
        }
        if(TilesetCanvasInteraction.DRAG_MODE_REMOVE === this.app.dragToggleMode){
            shouldProcess = tileExists
                && element.layers[ownerLayerIndex].type === this.app.activeLayerType;
        }
        if(TilesetCanvasInteraction.DRAG_MODE_MOVE === this.app.dragToggleMode){
            shouldProcess = !tileExists
                || element.layers[ownerLayerIndex].type !== this.app.activeLayerType;
        }
        if(!shouldProcess){
            return;
        }
        this.tileEditor.handleTileEditClick(tilesetIndex, tile.row, tile.col);
    }

    resetDragState()
    {
        this.app.isDragging = false;
        this.app.isRightDrag = false;
        this.app.dragToggleMode = null;
        this.app.lastDragTile = null;
    }

    handleCanvasMouseLeave()
    {
        if(!this.app.isDragging){
            return;
        }
        if(this.app.isAreaSelect){
            this.app.areaSelectEnd = this.app.areaSelectStart;
            return;
        }
        this.resetDragState();
    }

    handleCanvasMouseUp()
    {
        let wasDragging = this.app.isDragging;
        let draggedTileset = this.app.isAreaSelect
            ? this.app.areaSelectTileset
            : this.app.selectedTileset;
        if(this.app.isAreaSelect){
            let tilesetIndex = this.app.areaSelectTileset;
            let start = this.app.areaSelectStart;
            let end = this.app.areaSelectEnd;
            this.app.isAreaSelect = false;
            this.app.areaSelectTileset = null;
            this.app.areaSelectStart = null;
            this.app.areaSelectEnd = null;
            if(null !== tilesetIndex && start && end){
                let minRow = Math.min(start.row, end.row);
                let maxRow = Math.max(start.row, end.row);
                let minCol = Math.min(start.col, end.col);
                let maxCol = Math.max(start.col, end.col);
                this.tileEditor.applyAreaRemoval(tilesetIndex, minRow, maxRow, minCol, maxCol);
            }
        }
        this.resetDragState();
        if(wasDragging && null !== draggedTileset && this.app.legendStructureDirty){
            this.app.legendStructureDirty = false;
            this.app.editor.renderLegend(draggedTileset);
        }
    }
}
window.TilesetCanvasInteraction = TilesetCanvasInteraction;
