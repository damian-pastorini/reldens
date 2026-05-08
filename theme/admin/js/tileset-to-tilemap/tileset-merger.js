class TilesetMerger
{
    constructor(app)
    {
        this.app = app;
    }

    bind()
    {
        let mergeBtn = this.app.getElement('.merge-btn');
        mergeBtn.addEventListener('click', () => {
            this.app.modals.show(
                'Merge selected tilesets? This will combine them into one new tileset.',
                () => this.runMerge()
            );
        });
    }

    getCheckedMergeRows()
    {
        let result = [];
        for(let i = 0; i < this.app.state.length; i++){
            let row = document.querySelector('[data-tileset-index="'+i+'"]');
            if(!row){
                continue;
            }
            let checkbox = row.querySelector('.tileset-merge-checkbox');
            if(!checkbox || !checkbox.checked){
                continue;
            }
            result.push({index: i, row});
        }
        return result;
    }

    bindTileset(row, tilesetIndex)
    {
        let mergeCheckbox = row.querySelector('.tileset-merge-checkbox');
        let mergeConfigToggle = row.querySelector('.tileset-merge-config-toggle');
        let mergeConfig = row.querySelector('.tileset-merge-config');
        let autoResizeCheckbox = row.querySelector('.tileset-merge-auto-resize');
        let resizeOptions = row.querySelector('.tileset-merge-resize-options');
        let resizeRadios = row.querySelectorAll('.tileset-merge-resize-radio');
        let radioName = 'tileset-merge-resize-'+tilesetIndex;
        for(let radio of resizeRadios){
            radio.name = radioName;
        }
        mergeCheckbox.addEventListener('change', () => {
            if(mergeCheckbox.checked){
                let incompatible = this.checkMergeTileSizeCompatibility(tilesetIndex);
                if(incompatible){
                    mergeCheckbox.checked = false;
                    let msg = 'There\'s a tileset for '+incompatible.existingW+'x'+incompatible.existingH
                        +' already selected for merge. The current tileset with tile size '
                        +incompatible.currentW+'x'+incompatible.currentH+' is not compatible.'
                        +' Would you like to automatically resize this tileset?';
                    this.app.modals.show(
                        msg,
                        () => {
                            mergeCheckbox.checked = true;
                            this.setAutoResizeForAllChecked(tilesetIndex);
                            this.app.generator.updateMergeButtonState();
                        },
                        {
                            label: 'Check merge options',
                            callback: () => mergeConfig.classList.remove('hidden')
                        }
                    );
                    return;
                }
            }
            this.app.generator.updateMergeButtonState();
        });
        autoResizeCheckbox.addEventListener('change', () => {
            resizeOptions.classList.toggle('hidden', !autoResizeCheckbox.checked);
            if(autoResizeCheckbox.checked && !mergeCheckbox.checked){
                this.app.modals.show(
                    'Would you like to add this tileset to merge?',
                    () => {
                        mergeCheckbox.checked = true;
                        this.app.generator.updateMergeButtonState();
                    },
                    null
                );
                return;
            }
            if(!autoResizeCheckbox.checked && mergeCheckbox.checked){
                let incompatibleRows = this.findIncompatibleMergeRows(tilesetIndex);
                if(!incompatibleRows.length){
                    return;
                }
                let removed = 0;
                let processNext = (idx) => {
                    if(idx >= incompatibleRows.length){
                        if(removed > 0){
                            this.app.generator.updateMergeButtonState();
                        }
                        return;
                    }
                    let incompatibleRow = incompatibleRows[idx];
                    let incompatibleCheckbox = incompatibleRow.row.querySelector('.tileset-merge-checkbox');
                    let incompatibleTileset = this.app.state[incompatibleRow.index];
                    this.app.modals.show(
                        '"'+incompatibleTileset.filename+'" does not have a compatible tile size and will be removed from merge.'
                        +' Do you wish to proceed?',
                        () => {
                            incompatibleCheckbox.checked = false;
                            removed++;
                            processNext(idx + 1);
                        }
                    );
                };
                processNext(0);
            }
        });
        mergeConfigToggle.addEventListener('click', () => {
            mergeConfig.classList.toggle('hidden');
            row.querySelector('.tileset-map-config-fieldset').classList.add('hidden');
        });
    }

    checkMergeTileSizeCompatibility(tilesetIndex)
    {
        let currentTileset = this.app.state[tilesetIndex];
        if(!currentTileset){
            return null;
        }
        for(let {index, row} of this.getCheckedMergeRows()){
            if(index === tilesetIndex){
                continue;
            }
            let otherTileset = this.app.state[index];
            if(otherTileset.tileWidth !== currentTileset.tileWidth || otherTileset.tileHeight !== currentTileset.tileHeight){
                let otherAutoResize = row.querySelector('.tileset-merge-auto-resize');
                if(otherAutoResize && otherAutoResize.checked){
                    continue;
                }
                return {
                    existingW: otherTileset.tileWidth,
                    existingH: otherTileset.tileHeight,
                    currentW: currentTileset.tileWidth,
                    currentH: currentTileset.tileHeight
                };
            }
        }
        return null;
    }

    setAutoResizeForAllChecked(tilesetIndex)
    {
        let currentTileset = this.app.state[tilesetIndex];
        let currentRow = document.querySelector('[data-tileset-index="'+tilesetIndex+'"]');
        if(currentRow){
            currentRow.querySelector('.tileset-merge-auto-resize').checked = true;
            currentRow.querySelector('.tileset-merge-resize-options').classList.remove('hidden');
        }
        for(let {index, row} of this.getCheckedMergeRows()){
            if(index === tilesetIndex){
                continue;
            }
            let otherTileset = this.app.state[index];
            if(otherTileset.tileWidth === currentTileset.tileWidth && otherTileset.tileHeight === currentTileset.tileHeight){
                continue;
            }
            row.querySelector('.tileset-merge-auto-resize').checked = true;
            row.querySelector('.tileset-merge-resize-options').classList.remove('hidden');
        }
    }

    findIncompatibleMergeRows(referenceIndex)
    {
        let referenceTileset = this.app.state[referenceIndex];
        return this.getCheckedMergeRows().filter(({index}) => {
            if(index === referenceIndex){
                return false;
            }
            let tileset = this.app.state[index];
            return tileset.tileWidth !== referenceTileset.tileWidth || tileset.tileHeight !== referenceTileset.tileHeight;
        });
    }

    collectMergeTilesets()
    {
        return this.getCheckedMergeRows().map(({index, row}) => {
            let includeElements = row.querySelector('.tileset-merge-elements').checked;
            let includeClusters = row.querySelector('.tileset-merge-clusters').checked;
            let autoResize = row.querySelector('.tileset-merge-auto-resize').checked;
            let resizeStrategy = 'bigger';
            let checkedRadio = row.querySelector('.tileset-merge-resize-radio:checked');
            if(checkedRadio){
                resizeStrategy = checkedRadio.value;
            }
            return {
                stateIndex: index,
                tileset: this.app.generator.serializeTileset(this.app.state[index], false, index),
                includeElements,
                includeClusters,
                autoResize,
                resizeStrategy
            };
        });
    }

    async runMerge()
    {
        let tilesets = this.collectMergeTilesets();
        if(2 > tilesets.length){
            this.app.sessions.showStatus('Select at least 2 tilesets to merge', true);
            return;
        }
        this.app.modals.showGenerate('Merging tilesets...');
        let completed = false;
        try {
            let response = await fetch('merge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sessionId: this.app.sessionId, tilesets})
            });
            let reader = response.body.getReader();
            let decoder = new TextDecoder();
            let buffer = '';
            for(let chunk = await reader.read(); !chunk.done; chunk = await reader.read()){
                buffer += decoder.decode(chunk.value, {stream: true});
                let parts = buffer.split('\n\n');
                buffer = parts.pop();
                for(let part of parts){
                    if(await this.handleMergeEvent(part)){
                        completed = true;
                    }
                }
            }
        } catch(error) {
            this.app.sessions.showStatus('Merge error: '+error.message, true);
        }
        if(!completed){
            this.app.modals.hideGenerate();
        }
    }

    async handleMergeEvent(eventText)
    {
        let parsed = SharedUtils.parseSSEEvent(eventText);
        if(!parsed){
            return false;
        }
        let {eventType, data} = parsed;
        if('progress' === eventType){
            this.app.modals.showGenerate(data.message);
            return false;
        }
        if('error' === eventType){
            this.app.modals.hideGenerate();
            this.app.sessions.showStatus('Error: '+(data.message || 'Unknown error'), true);
            return true;
        }
        if('done' === eventType){
            this.app.modals.hideGenerate();
            this.applyMergeResult(data.mergedTileset, data.stateIndices);
            this.app.sessions.showStatus('Tilesets merged successfully', false);
            await this.app.sessions.refreshSessionInList(this.app.sessionId);
            return true;
        }
        return false;
    }

    applyMergeResult(mergedTilesetData, mergedStateIndices)
    {
        let sorted = [...mergedStateIndices].sort((a, b) => b - a);
        let mapMeta = this.app.stateBuilder.collectMapMeta();
        for(let i of sorted){
            this.app.state.splice(i, 1);
            mapMeta.splice(i, 1);
        }
        this.app.stateBuilder.resetState();
        this.app.stateBuilder.rebuildAllRows(mapMeta);
        this.app.stateBuilder.append({
            sessionId: this.app.sessionId,
            showAiControls: this.app.showAiControls,
            activeProviders: this.app.activeProviders,
            tilesets: [mergedTilesetData]
        });
        if(!this.app.state.length){
            this.app.hideReviewSection();
        }
    }
}
