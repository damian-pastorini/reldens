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
        this.bindControls(row, i, list);
        this.app.refresh(i);
    }

    bindHeader(row, i)
    {
        let collapseBtn = row.querySelector('.tileset-collapse-btn');
        let tilesetHeader = row.querySelector('.tileset-header');
        tilesetHeader.addEventListener('click', () => {
            let isCollapsed = row.classList.toggle('collapsed');
            let icon = collapseBtn.querySelector('.tileset-collapse-icon');
            icon.src = '/assets/admin/'+(isCollapsed
                ? 'circle-chevron-down-solid-full'
                : 'circle-chevron-up-solid-full')+'.svg';
        });
    }

    bindCanvas(canvas, i)
    {
        canvas.addEventListener('mousedown', (e) => this.app.interaction.handleCanvasMouseDown(e, i));
        canvas.addEventListener('mousemove', (e) => this.app.interaction.handleCanvasMouseMove(e, i));
        canvas.addEventListener('mouseup', () => this.app.interaction.handleCanvasMouseUp());
        canvas.addEventListener('mouseleave', () => this.app.interaction.handleCanvasMouseUp());
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        canvas.addEventListener('wheel', (e) => {
            if(!e.ctrlKey){
                return;
            }
            e.preventDefault();
            let delta = e.deltaY < 0 ? 1.25 : 0.8;
            this.app.zoomLevels[i] = Math.min(4, Math.max(0.25, this.app.zoomLevels[i] * delta));
            this.app.renderer.applyZoom(i);
        }, { passive: false });
    }

    bindRefs(row, i, canvas, list)
    {
        this.app.zoomLevels[i] = 1;
        this.app.refs[i] = {
            canvas,
            list,
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
            showSpotsCheck: row.querySelector('.show-spots-check')
        };
    }

    bindControls(row, i, list)
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
            let checkboxes = list.querySelectorAll('.element-bulk-select');
            let isChecked = refs.bulkSelectAll.checked;
            for(let checkbox of checkboxes){
                checkbox.checked = isChecked;
            }
            for(let el of this.app.state[capturedI].elements){
                el.bulkSelected = isChecked;
            }
            this.app.generator.updateGenerateButtonState();
        });
        refs.legendSearch.addEventListener('input', () => this.app.editor.renderLegend(capturedI));
        refs.showElementsCheck.addEventListener('change', () => this.app.editor.renderLegend(capturedI));
        refs.showClustersCheck.addEventListener('change', () => this.app.editor.renderLegend(capturedI));
        if(refs.showSpotsCheck){
            refs.showSpotsCheck.addEventListener('change', () => this.app.editor.renderLegend(capturedI));
        }
        this.bindViewControls(capturedI, refs);
        this.bindSessionControls(row, capturedI);
        this.bindLegendTabs(row);
        if(this.app.tileOptionsBinder){
            this.app.tileOptionsBinder.bind(capturedI, row);
        }
    }

    bindLegendTabs(row)
    {
        let tabs = row.querySelectorAll('.legend-tab');
        let panes = row.querySelectorAll('.legend-tab-pane');
        for(let tab of tabs){
            tab.addEventListener('click', () => {
                this.activateLegendTab(tab, tabs, panes);
            });
        }
    }

    activateLegendTab(activeTab, tabs, panes)
    {
        let targetTab = activeTab.dataset.tab;
        this.setLegendTabActive(activeTab, tabs);
        this.setLegendPaneVisible(targetTab, panes);
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
        refs.toggleAllBtn.textContent = 'Hide Others';
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
