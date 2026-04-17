class TilesetAnalyzerApp
{
    constructor()
    {
        this.state = [];
        this.sessionId = null;
        this.selectedTileset = null;
        this.selectedElement = null;
        this.selectedSpot = null;
        this.activeLayerType = 'below-player';
        this.refs = {};
        this.imageCache = {};
        this.zoomLevels = {};
        this.customLayerSuffix = '';
        this.isDragging = false;
        this.isRightDrag = false;
        this.dragToggleMode = null;
        this.lastDragTile = null;
        this.mouseButtonRight = 2;
        this.showAiControls = false;
        this.activeProviders = [];
        this.runningDetections = 0;
        this.showAllElements = true;
        this.viewAllMode = true;
        this.isAreaSelect = false;
        this.areaSelectTileset = null;
        this.areaSelectStart = null;
        this.areaSelectEnd = null;
        this.tileGeometry = new TileGeometry();
        this.renderer = new TilesetCanvasRenderer(this);
        this.interaction = new TilesetCanvasInteraction(this);
        this.editor = new TilesetElementEditor(this);
        this.ai = new TilesetAiOperations(this);
        this.aiElement = new TilesetAiElementOperations(this);
        this.aiRequestBuilder = new TilesetAiRequestBuilder(this);
        this.sessions = new TilesetSessionManager(this);
        this.uploader = new TilesetUploader(this);
        this.stateBuilder = new TilesetStateBuilder(this);
        this.strategyEditor = new TilesetStrategyEditor(this);
        this.generator = new TilesetGenerator(this);
        this.merger = new TilesetMerger(this);
        this.modals = new TilesetModalManager(this);
        this.keyboard = new TilesetKeyboardShortcuts(this);
        this.events = new TilesetEventBindings(this);
        this.tileOptionsBinder = new TilesetTileOptionsBinder(this);
        this.globalTileOptions = null;
        this.globalPanelBound = false;
    }

    getElement(selector)
    {
        return document.querySelector(selector);
    }

    updatePaletteStyles()
    {
        let totalElements = 0;
        for(let tilesetState of this.state){
            totalElements += tilesetState.elements.length;
        }
        let css = '';
        for(let i = 0; i < totalElements; i++){
            css += '.element-color-'+i+' { background-color: '+SharedUtils.colorForIndex(i)+'; }\n';
        }
        this.getElement('.dynamic-palette').textContent = css;
        this.updateGlobalTileOptionsPanel();
    }

    updateGlobalTileOptionsPanel()
    {
        let panel = this.getElement('.global-tile-options');
        let btn = this.getElement('.global-tile-options-toggle-btn');
        if(!panel || !btn){
            return;
        }
        let shouldShow = this.state.length > 1;
        btn.classList.toggle('hidden', !shouldShow);
        if(!shouldShow){
            panel.classList.add('hidden');
            return;
        }
        if(this.globalPanelBound){
            return;
        }
        this.globalPanelBound = true;
        btn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
        });
        let tileOptionsPanel = panel.querySelector('.tileset-tile-options');
        if(tileOptionsPanel){
            this.tileOptionsBinder.bindGlobal(tileOptionsPanel);
        }
    }

    showReviewSection()
    {
        this.getElement('.review-section').classList.remove('hidden');
        this.getElement('.new-session-btn').classList.remove('hidden');
    }

    hideReviewSection()
    {
        this.getElement('.review-section').classList.add('hidden');
        this.getElement('.new-session-btn').classList.add('hidden');
    }

    clearSelection(tilesetIndex)
    {
        this.selectedTileset = null;
        this.selectedElement = null;
        this.updatePaletteStyles();
        this.refresh(tilesetIndex);
    }

    getGlobalOffset(tilesetIndex)
    {
        let offset = 0;
        for(let i = 0; i < tilesetIndex; i++){
            offset += this.state[i].elements.length;
        }
        return offset;
    }

    refresh(tilesetIndex)
    {
        this.renderer.renderCanvas(tilesetIndex);
        if(!this.isDragging){
            this.editor.renderLegend(tilesetIndex);
        }
    }

    resetViewAllButtons()
    {
        for(let j = 0; j < this.state.length; j++){
            if(!this.refs[j]){
                continue;
            }
            if(this.refs[j].toggleAllBtn){
                this.refs[j].toggleAllBtn.textContent = 'Highlight All';
            }
            if(this.refs[j].viewAllBtn){
                this.refs[j].viewAllBtn.textContent = 'View All';
            }
        }
    }

    reindexColors(tilesetIndex)
    {
        let globalOffset = this.getGlobalOffset(tilesetIndex);
        let elements = this.state[tilesetIndex].elements;
        for(let i = 0; i < elements.length; i++){
            elements[i].colorIndex = globalOffset + i;
        }
    }

    renderAll()
    {
        for(let j = 0; j < this.state.length; j++){
            this.renderer.renderCanvas(j);
            this.editor.renderLegend(j);
        }
    }

    renderAllCanvases()
    {
        for(let j = 0; j < this.state.length; j++){
            this.renderer.renderCanvas(j);
        }
    }

    collectLayerTiles(seen, tiles, layer)
    {
        for(let tile of layer.tiles){
            let key = SharedUtils.tileKey(tile);
            if(seen.has(key)){
                continue;
            }
            seen.add(key);
            tiles.push(tile);
        }
    }

    collectElementTiles(element)
    {
        let seen = new Set();
        let tiles = [];
        for(let layer of element.layers){
            this.collectLayerTiles(seen, tiles, layer);
        }
        return tiles;
    }

    async init()
    {
        await this.sessions.load();
        this.uploader.bind();
        this.generator.bind();
        this.merger.bind();
        this.modals.bind();
        this.keyboard.bind();
        this.events.bind();
    }
}

new TilesetAnalyzerApp().init();
