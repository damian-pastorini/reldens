/* exported TilesetRowBinder */
class TilesetRowBinder
{
    constructor(app)
    {
        this.app = app;
    }

    bind(row, i)
    {
        let canvas = row.querySelector('.tileset-canvas');
        canvas.dataset.tilesetIndex = i;
        let list = row.querySelector('.elements-list');
        this.bindHeader(row, i);
        this.bindCanvas(canvas, i);
        this.bindRefs(row, i, canvas, list);
        this.bindControls(row, i);
        this.applyCollapsedState(row, i);
        this.app.refresh(i);
    }

    applyCollapsedState(row, i)
    {
        if(this.app.state[i] && this.app.state[i].collapsed){
            row.classList.add('collapsed');
        }
    }

    bindHeader(row, i)
    {
        let tilesetHeader = row.querySelector('.tileset-header');
        tilesetHeader.addEventListener('click', () => {
            row.classList.toggle('collapsed');
            if(this.app.state[i]){
                this.app.state[i].collapsed = row.classList.contains('collapsed');
            }
        });
    }

    bindCanvas(canvas, i)
    {
        canvas.addEventListener('mousedown', (mouseEvent) => this.app.interaction.handleCanvasMouseDown(mouseEvent, i));
        canvas.addEventListener('mousemove', (mouseEvent) => this.app.interaction.handleCanvasMouseMove(mouseEvent, i));
        canvas.addEventListener('mouseup', () => this.app.interaction.handleCanvasMouseUp());
        canvas.addEventListener('mouseleave', () => this.app.interaction.handleCanvasMouseLeave());
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        canvas.addEventListener('wheel', (wheelEvent) => {
            if(!wheelEvent.ctrlKey){
                return;
            }
            wheelEvent.preventDefault();
            let delta = wheelEvent.deltaY < 0 ? 1.25 : 0.8;
            this.app.zoomLevels[i] = Math.min(4, Math.max(0.25, this.app.zoomLevels[i] * delta));
            this.app.renderer.applyZoom(i);
        }, { passive: false });
    }

    bindRefs(row, i, canvas, list)
    {
        this.app.zoomLevels[i] = 1;
        this.app.refs[i] = {
            row,
            canvas,
            list,
            canvasScroll: canvas.parentElement,
            addBtn: row.querySelector('.add-element-btn'),
            toggleAllBtn: row.querySelector('.toggle-all-btn'),
            viewAllBtn: row.querySelector('.view-all-btn'),
            bulkConvertBtn: row.querySelector('.bulk-convert-btn'),
            bulkLockBtn: row.querySelector('.bulk-lock-btn'),
            bulkDetectBtn: row.querySelector('.bulk-detect-btn'),
            bulkNameBtn: row.querySelector('.bulk-name-btn'),
            aiSelect: row.querySelector('.tileset-ai-select'),
            detectElementsBtn: row.querySelector('.tileset-detect-elements-btn'),
            detectLayersBtn: row.querySelector('.tileset-detect-layers-btn'),
            nameAllBtn: row.querySelector('.tileset-name-all-btn'),
            aiProgressMsg: row.querySelector('.tileset-ai-progress-msg'),
            bulkSelectAll: row.querySelector('.bulk-select-all'),
            legendSearch: row.querySelector('.legend-search'),
            showElementsCheck: row.querySelector('.show-elements-check'),
            showClustersCheck: row.querySelector('.show-clusters-check'),
            showSpotsCheck: row.querySelector('.show-spots-check'),
            bulkDeleteSpotsBtn: row.querySelector('.bulk-delete-spots-btn')
        };
    }

    bindControls(row, i)
    {
        let refs = this.app.refs[i];
        let capturedI = i;
        let hasAi = this.app.showAiControls && this.app.activeProviders.length;
        let zoomResetBtn = row.querySelector('.zoom-reset-btn');
        refs.addBtn.addEventListener('click', () => this.app.editor.addElement(capturedI));
        zoomResetBtn.addEventListener('click', () => {
            this.app.zoomLevels[capturedI] = 1;
            this.app.renderer.applyZoom(capturedI);
        });
        refs.bulkConvertBtn.addEventListener('click', () => this.app.editor.bulkConvert(capturedI));
        refs.bulkLockBtn.addEventListener('click', () => this.app.editor.bulkToggleLock(capturedI));
        refs.bulkDetectBtn.classList.toggle('hidden', !hasAi);
        refs.bulkNameBtn.classList.toggle('hidden', !hasAi);
        if(hasAi){
            refs.bulkDetectBtn.addEventListener('click', () => this.app.ai.bulkDetectAi(capturedI));
            refs.bulkNameBtn.addEventListener('click', () => this.app.ai.bulkNameAi(capturedI));
        }
        for(let aiEl of row.querySelectorAll('.tileset-ai-only')){
            aiEl.classList.toggle('hidden', !hasAi);
        }
        if(hasAi){
            SharedUtils.populateProviderSelect(refs.aiSelect, this.app.activeProviders);
            refs.detectElementsBtn.addEventListener(
                'click', () => this.app.ai.runAiDetectElements(capturedI, refs.detectElementsBtn)
            );
            refs.detectLayersBtn.addEventListener(
                'click', () => this.app.ai.runAiDetectLayers(capturedI, refs.detectLayersBtn)
            );
            refs.nameAllBtn.addEventListener('click', () => this.app.ai.runAiName(capturedI, refs.nameAllBtn));
        }
        refs.bulkSelectAll.addEventListener('change', () => {
            this.applyBulkSelection(capturedI, refs);
        });
        refs.legendSearch.addEventListener('input', () => this.scheduleLegendSearch(capturedI));
        refs.showElementsCheck.addEventListener('change', () => this.applyFilterChange(capturedI));
        refs.showClustersCheck.addEventListener('change', () => this.applyFilterChange(capturedI));
        if(refs.showSpotsCheck){
            refs.showSpotsCheck.addEventListener('change', () => this.applyFilterChange(capturedI));
        }
        if(refs.bulkDeleteSpotsBtn){
            refs.bulkDeleteSpotsBtn.addEventListener('click', () => this.bulkDeleteSelectedMapObjects(capturedI));
        }
        this.bindViewControls(capturedI, refs);
        this.bindSessionControls(row, capturedI);
        this.bindLegendTabs(row, capturedI);
        this.app.editor.legendInteractions.bindListContainer(capturedI);
        this.app.tooltipPlacement.bindOnce();
        if(this.app.tileOptionsBinder){
            this.app.tileOptionsBinder.bind(capturedI, row);
        }
    }

    applyFilterChange(tilesetIndex)
    {
        this.app.editor.legendRenderer.applyLegendVisibility(tilesetIndex);
        this.app.renderer.renderCanvas(tilesetIndex);
    }

    scheduleLegendSearch(tilesetIndex)
    {
        if(this.searchDebounceTimers && this.searchDebounceTimers[tilesetIndex]){
            clearTimeout(this.searchDebounceTimers[tilesetIndex]);
        }
        if(!this.searchDebounceTimers){
            this.searchDebounceTimers = {};
        }
        this.searchDebounceTimers[tilesetIndex] = setTimeout(() => {
            this.searchDebounceTimers[tilesetIndex] = null;
            this.app.editor.legendRenderer.applyLegendVisibility(tilesetIndex);
        }, 100);
    }

    applyBulkSelection(tilesetIndex, refs)
    {
        let isChecked = refs.bulkSelectAll.checked;
        let filter = this.app.editor.elementVisibilityFilter(refs);
        for(let element of this.app.state[tilesetIndex].elements){
            if(!this.app.editor.matchesVisibilityFilter(element, filter)){
                continue;
            }
            element.bulkSelected = isChecked;
        }
        if(filter.showSpots){
            for(let spot of this.app.state[tilesetIndex].spots || []){
                spot.bulkSelected = isChecked;
            }
        }
        for(let checkbox of refs.list.querySelectorAll('.element-bulk-select')){
            let row = checkbox.closest('.element-row, .spot-row');
            if(row && row.classList.contains('hidden')){
                continue;
            }
            checkbox.checked = isChecked;
        }
        this.app.generator.updateGenerateButtonState();
    }

    countSelected(items, remaining)
    {
        let count = 0;
        for(let item of items){
            if(item.bulkSelected){
                count++;
                continue;
            }
            remaining.push(item);
        }
        return count;
    }

    bulkDeleteSelectedMapObjects(tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let remainingElements = [];
        let remainingSpots = [];
        let totalCount = this.countSelected(tileset.elements, remainingElements);
        totalCount += this.countSelected(tileset.spots || [], remainingSpots);
        if(!totalCount){
            return;
        }
        this.app.modals.show(
            'Delete '+totalCount+' selected item(s)?',
            () => {
                tileset.elements = remainingElements;
                tileset.spots = remainingSpots;
                this.app.selectedTileset = null;
                this.app.selectedElement = null;
                this.app.updatePaletteStyles();
                this.app.refresh(tilesetIndex);
            }
        );
    }

    bindLegendTabs(row, tilesetIndex)
    {
        let tabs = row.querySelectorAll('.legend-tab');
        let panes = row.querySelectorAll('.legend-tab-pane');
        for(let tab of tabs){
            tab.addEventListener('click', () => {
                this.activateLegendTab(tab, tabs, panes, tilesetIndex);
                this.app.renderer.renderCanvas(tilesetIndex);
            });
        }
    }

    activateLegendTab(activeTab, tabs, panes, tilesetIndex)
    {
        let targetTab = activeTab.dataset.tab;
        this.setLegendTabActive(activeTab, tabs);
        this.setLegendPaneVisible(targetTab, panes);
        if(undefined !== tilesetIndex && this.app.refs[tilesetIndex]){
            this.app.refs[tilesetIndex].activeTab = targetTab;
        }
    }

    setLegendTabActive(activeTab, tabs)
    {
        for(let t of tabs){
            t.classList.toggle('legend-tab-active', t === activeTab);
        }
    }

    setLegendPaneVisible(targetTab, panes)
    {
        for(let p of panes){
            p.classList.toggle('hidden', p.dataset.tab !== targetTab);
        }
    }

    bindViewControls(capturedI, refs)
    {
        refs.toggleAllBtn.textContent = this.app.showAllElements ? 'Hide Others' : 'Highlight All';
        refs.viewAllBtn.textContent = this.app.viewAllMode ? 'View Selected' : 'View All';
        refs.toggleAllBtn.addEventListener('click', () => {
            this.app.showAllElements = !this.app.showAllElements;
            refs.toggleAllBtn.textContent = this.app.showAllElements ? 'Hide Others' : 'Highlight All';
            this.app.renderAllCanvases();
        });
        refs.viewAllBtn.addEventListener('click', () => {
            this.app.viewAllMode = !this.app.viewAllMode;
            refs.viewAllBtn.textContent = this.app.viewAllMode ? 'View Selected' : 'View All';
            if(this.app.viewAllMode){
                this.app.selectedElement = null;
                this.app.selectedTileset = null;
            }
            this.app.renderAll();
        });
    }

    bindSessionControls(row, capturedI)
    {
        let saveBtn = row.querySelector('.tileset-save-btn');
        saveBtn.addEventListener('click', () => this.app.sessions.saveTileset(capturedI));
        let removeTilesetBtn = row.querySelector('.tileset-remove-btn');
        removeTilesetBtn.addEventListener('click', () => {
            this.app.modals.show(
                'Remove "'+this.app.state[capturedI].filename+'" from the editor?',
                () => this.app.stateBuilder.removeTileset(capturedI)
            );
        });
        let mapConfigToggle = row.querySelector('.tileset-map-config-toggle');
        let mapConfigFieldset = row.querySelector('.tileset-map-config-fieldset');
        mapConfigToggle.addEventListener('click', () => {
            mapConfigFieldset.classList.toggle('hidden');
            row.querySelector('.tileset-merge-config').classList.add('hidden');
        });
    }
}
