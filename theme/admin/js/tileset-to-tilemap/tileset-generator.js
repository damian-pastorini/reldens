class TilesetGenerator
{
    constructor(app)
    {
        this.app = app;
    }

    bindGenerateConfirm(btn, message, callback)
    {
        btn.addEventListener('click', () => this.app.modals.show(message, callback));
    }

    bind()
    {
        let msg = 'Are you sure? This will save all tilesets and generate the files.';
        this.bindGenerateConfirm(
            this.app.getElement('.generate-btn'), msg, () => this.generate(false)
        );
        this.bindGenerateConfirm(
            this.app.getElement('.generate-selected-btn'), msg, () => this.generate(true)
        );
        this.app.getElement('.save-session-btn').addEventListener(
            'click', () => this.app.sessions.saveAll()
        );
    }

    bindTileset(row, tilesetIndex)
    {
        let msg = 'Are you sure? This will save this tileset and generate the files.';
        this.bindGenerateConfirm(
            row.querySelector('.tileset-generate-btn'), msg, () => this.generateSingle(tilesetIndex, false)
        );
        this.bindGenerateConfirm(
            row.querySelector('.tileset-generate-selected-btn'), msg, () => this.generateSingle(tilesetIndex, true)
        );
        this.app.strategyEditor.bind(row);
    }

    buildNewSessionId()
    {
        let timestamp = SharedUtils.buildSessionTimestamp();
        let nameInput = document.querySelector('.session-name-input');
        let name = nameInput ? nameInput.value.trim() : '';
        if(!name){
            return timestamp;
        }
        return timestamp+'-'+name;
    }

    buildSessionId()
    {
        let overrideCheckbox = document.querySelector('.override-files-checkbox');
        if(overrideCheckbox && overrideCheckbox.checked){
            return this.app.sessionId;
        }
        return this.buildNewSessionId();
    }

    async generate(selectedOnly)
    {
        await this.runGenerate(this.getSerializableState(selectedOnly), false);
    }

    async generateSingle(tilesetIndex, selectedOnly)
    {
        await this.runGenerate(
            [this.serializeTileset(this.app.state[tilesetIndex], selectedOnly, tilesetIndex)],
            true
        );
    }

    async runGenerate(tilesets, forceNewSession)
    {
        if(!this.app.sessionId){
            return;
        }
        let sessionId = forceNewSession ? this.buildNewSessionId() : this.buildSessionId();
        this.app.modals.showGenerate('Generating files...');
        let response = await fetch('generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, tilesets, fullTilesets: this.getSerializableState(false), globalTileOptions: this.app.globalTileOptions || null })
        });
        let data = await response.json();
        this.app.modals.hideGenerate();
        if(!data.files){
            this.app.sessions.showStatus('Error: '+(data.error || 'Unknown error'), true);
            return;
        }
        this.lastGeneratedSessionId = sessionId;
        this.app.sessions.addSession(sessionId, data.files);
        this.app.sessions.showStatus('Files successfully generated', false);
        this.showResults(sessionId, data.files);
    }

    showResults(sessionId, files)
    {
        let resultsSection = this.app.getElement('.results-section');
        if(!resultsSection){
            return;
        }
        let zipLink = this.app.getElement('.download-zip-link');
        if(zipLink){
            zipLink.href = 'download-zip/'+sessionId;
        }
        let resultsList = this.app.getElement('.results-list');
        if(resultsList){
            resultsList.textContent = '';
            for(let file of files){
                let li = document.createElement('li');
                let a = document.createElement('a');
                a.href = file.downloadUrl;
                a.textContent = file.name;
                a.download = file.name;
                li.appendChild(a);
                resultsList.appendChild(li);
            }
        }
        resultsSection.classList.remove('hidden');
    }

    serializeTileset(tileset, selectedOnly, tilesetIndex)
    {
        let elements = [];
        for(let element of tileset.elements){
            if(selectedOnly && !element.bulkSelected){
                continue;
            }
            elements.push({
                name: element.name,
                type: element.type,
                approved: element.approved,
                colorIndex: element.colorIndex,
                quantity: element.quantity,
                freeSpaceAround: element.freeSpaceAround,
                allowPathsInFreeSpace: element.allowPathsInFreeSpace,
                layers: element.layers
            });
        }
        let row = document.querySelector('[data-tileset-index="'+tilesetIndex+'"]');
        let mapName = row ? row.querySelector('.tileset-map-name').value || 'tileset-elements' : 'tileset-elements';
        let mapTitle = row ? row.querySelector('.tileset-map-title').value || 'Tileset Elements' : 'Tileset Elements';
        let generatorTypeEl = row ? row.querySelector('.tileset-generator-type') : null;
        let generatorType = generatorTypeEl ? generatorTypeEl.value : 'elements-composite-loader';
        let associationsProperties = row
            ? this.app.strategyEditor.readAssociationsProperties(row)
            : null;
        return {
            imageId: tileset.imageId,
            imageUrl: tileset.imageUrl,
            filename: tileset.filename,
            filePath: tileset.filePath,
            imageWidth: tileset.imageWidth,
            imageHeight: tileset.imageHeight,
            tileWidth: tileset.tileWidth,
            tileHeight: tileset.tileHeight,
            spacing: tileset.spacing,
            margin: tileset.margin,
            tilesetColumns: tileset.tilesetColumns,
            tileRows: tileset.tileRows,
            tileCount: tileset.tileCount,
            filteredTiles: tileset.filteredTiles || [],
            originalTileWidth: tileset.originalTileWidth,
            originalTileHeight: tileset.originalTileHeight,
            resizeOption: tileset.resizeOption || 0,
            mapName,
            mapTitle,
            generatorType,
            associationsProperties,
            tileOptions: tileset.tileOptions || null,
            spots: tileset.spots || [],
            elements
        };
    }

    getSerializableState(selectedOnly)
    {
        let result = [];
        for(let i = 0; i < this.app.state.length; i++){
            result.push(this.serializeTileset(this.app.state[i], selectedOnly, i));
        }
        return result;
    }

    updateTilesetGenerateVisibility()
    {
        let show = 1 < this.app.state.length;
        let rows = document.querySelectorAll('.tileset-generate-config-row');
        for(let row of rows){
            row.classList.toggle('hidden', !show);
        }
    }

    updateMergeButtonState()
    {
        let checkedCount = 0;
        for(let i = 0; i < this.app.state.length; i++){
            let row = document.querySelector('[data-tileset-index="'+i+'"]');
            if(!row){
                continue;
            }
            let checkbox = row.querySelector('.tileset-merge-checkbox');
            if(checkbox && checkbox.checked){
                checkedCount++;
            }
        }
        let mergeBtn = this.app.getElement('.merge-btn');
        if(mergeBtn){
            mergeBtn.disabled = 2 > checkedCount;
        }
    }

    updateGenerateButtonState()
    {
        let hasErrors = document.querySelectorAll('.element-name-invalid').length > 0;
        let hasSelected = 0 < document.querySelectorAll('.element-bulk-select:checked').length;
        this.app.getElement('.generate-btn').disabled = hasErrors;
        this.app.getElement('.generate-selected-btn').disabled = hasErrors || !hasSelected;
        this.updateTilesetGenerateVisibility();
        this.updateMergeButtonState();
        for(let i = 0; i < this.app.state.length; i++){
            let row = document.querySelector('[data-tileset-index="'+i+'"]');
            if(!row){
                continue;
            }
            let rowErrors = row.querySelectorAll('.element-name-invalid').length > 0;
            let rowSelected = 0 < row.querySelectorAll('.element-bulk-select:checked').length;
            row.querySelector('.tileset-generate-btn').disabled = rowErrors;
            row.querySelector('.tileset-generate-selected-btn').disabled = rowErrors || !rowSelected;
        }
    }
}
