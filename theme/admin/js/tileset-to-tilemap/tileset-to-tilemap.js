class TilesetAnalyzerApp
{
    constructor()
    {
        this.state = [];
        this.sessionId = null;
        this.selectedTileset = null;
        this.selectedElement = null;
        this.selectedSpot = null;
        this.activeLayerType = SharedUtils.DEFAULT_LAYER_TYPE;
        this.refs = {};
        this.imageCache = {};
        this.zoomLevels = {};
        this.customLayerSuffix = '';
        this.isDragging = false;
        this.isRightDrag = false;
        this.dragToggleMode = null;
        this.lastDragTile = null;
        this.canvasRedrawScheduled = false;
        this.pendingRedrawIndex = null;
        this.activeAbortControllers = new Set();
        this.mouseButtonRight = SharedUtils.MOUSE_BUTTON_RIGHT;
        this.showAiControls = false;
        this.activeProviders = [];
        this.runningDetections = 0;
        this.showAllElements = true;
        this.viewAllMode = true;
        this.isAreaSelect = false;
        this.legendStructureDirty = false;
        this.areaSelectTileset = null;
        this.areaSelectStart = null;
        this.areaSelectEnd = null;
        this.tileGeometry = new TileGeometry();
        this.renderer = new TilesetCanvasRenderer(this);
        this.interaction = new TilesetCanvasInteraction(this);
        this.editor = new TilesetElementEditor(this);
        this.ai = new TilesetAiOperations(this);
        this.aiElement = new TilesetAiElementOperations(this);
        this.aiBulk = new TilesetAiBulkOperations(this);
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
        this.tooltipPlacement = new TilesetTooltipPlacement(this);
        this.globalTileOptions = null;
        this.globalPanelBound = false;
    }

    getElement(selector)
    {
        return document.querySelector(selector);
    }

    countTotalElements()
    {
        let totalElements = 0;
        for(let tilesetState of this.state){
            totalElements += tilesetState.elements.length;
        }
        return totalElements;
    }

    rebuildPaletteCss(totalElements)
    {
        if(!this.dynamicPaletteEl){
            this.dynamicPaletteEl = this.getElement('.dynamic-palette');
        }
        let css = '';
        for(let i = 0; i < totalElements; i++){
            css = css+'.element-color-'+i+' { background-color: '+SharedUtils.colorForIndex(i)+'; }\n';
        }
        this.dynamicPaletteEl.textContent = css;
    }

    updatePaletteStyles()
    {
        let totalElements = this.countTotalElements();
        if(this.cachedTotalElements !== totalElements){
            this.cachedTotalElements = totalElements;
            this.rebuildPaletteCss(totalElements);
        }
        this.updateGlobalTileOptionsPanel();
    }

    updateGlobalTileOptionsPanel()
    {
        let panel = this.getElement('.global-tile-options');
        let toggleButton = this.getElement('.global-tile-options-toggle-btn');
        if(!panel || !toggleButton){
            return;
        }
        let shouldShow = this.state.length > 1;
        toggleButton.classList.toggle('hidden', !shouldShow);
        if(!shouldShow){
            panel.classList.add('hidden');
            return;
        }
        if(this.globalPanelBound){
            return;
        }
        this.globalPanelBound = true;
        toggleButton.addEventListener('click', () => {
            let isClosing = !panel.classList.contains('hidden');
            panel.classList.toggle('hidden');
            toggleButton.classList.toggle('active', !panel.classList.contains('hidden'));
            if(isClosing && this.tileOptionsBinder && -1 === this.tileOptionsBinder.activeTilesetIndex){
                this.tileOptionsBinder.deactivate();
            }
            this.renderAllCanvases();
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

    toggleMapsWizardButtons(hidden)
    {
        for(let selector of ['.all-to-maps-wizard-btn', '.selected-to-maps-wizard-btn']){
            let wizardBtn = this.getElement(selector);
            if(wizardBtn){
                wizardBtn.classList.toggle('hidden', hidden);
            }
        }
    }

    hideReviewSection()
    {
        this.getElement('.review-section').classList.add('hidden');
        this.getElement('.new-session-btn').classList.add('hidden');
        this.toggleMapsWizardButtons(true);
    }

    showMapsWizardBtn()
    {
        this.toggleMapsWizardButtons(false);
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

    findTilesetIndexByFilename(filename)
    {
        for(let j = 0; j < this.state.length; j++){
            if(this.state[j].filename === filename){
                return j;
            }
        }
        return -1;
    }

    createAbortController()
    {
        let controller = new AbortController();
        this.activeAbortControllers.add(controller);
        return controller;
    }

    releaseAbortController(controller)
    {
        this.activeAbortControllers.delete(controller);
    }

    abortAllRequests()
    {
        for(let controller of this.activeAbortControllers){
            controller.abort();
        }
        this.activeAbortControllers.clear();
    }

    refresh(tilesetIndex)
    {
        if(this.isDragging){
            this.scheduleCanvasRedraw(tilesetIndex);
            return;
        }
        this.renderer.renderCanvas(tilesetIndex);
        this.editor.renderLegend(tilesetIndex);
    }

    scheduleCanvasRedraw(tilesetIndex)
    {
        this.pendingRedrawIndex = tilesetIndex;
        if(this.canvasRedrawScheduled){
            return;
        }
        this.canvasRedrawScheduled = true;
        requestAnimationFrame(() => {
            this.canvasRedrawScheduled = false;
            let pendingIndex = this.pendingRedrawIndex;
            this.pendingRedrawIndex = null;
            if(null !== pendingIndex){
                this.renderer.renderCanvas(pendingIndex);
            }
        });
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
