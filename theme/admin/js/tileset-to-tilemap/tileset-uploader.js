class TilesetUploader
{
    constructor(app)
    {
        this.app = app;
    }

    resetForm()
    {
        this.fileInput.value = '';
        this.paramsContainer.textContent = '';
        this.paramBinder.clearResizeAll();
        this.app.getElement('.resize-all-section').classList.add('hidden');
    }

    async onFormSubmit(e, fileInput, paramsContainer)
    {
        e.preventDefault();
        if(!fileInput.files.length){
            this.app.getElement('.analyze-btn').disabled = false;
            return;
        }
        let toUpload = this.paramBinder.buildUploadList(fileInput, paramsContainer);
        let messageEl = this.app.getElement('.upload-message');
        if(!toUpload.length){
            messageEl.classList.remove('hidden');
            messageEl.textContent = 'All selected files already exist in the editor.';
            this.app.getElement('.analyze-btn').disabled = false;
            return;
        }
        this.pendingUpload = toUpload;
        this.app.getElement('.generated-files-list').classList.add('hidden');
        this.app.getElement('.generated-files-search').classList.add('hidden');
        this.app.getElement('.analyze-btn').disabled = true;
        this.app.getElement('.upload-loading').classList.remove('hidden');
        messageEl.classList.remove('hidden');
        messageEl.textContent = 'Starting analysis...';
        await this.runUpload(toUpload, messageEl);
        this.app.getElement('.analyze-btn').disabled = false;
        this.app.getElement('.upload-loading').classList.add('hidden');
    }

    async runUpload(toUpload, messageEl)
    {
        let resizeAllValue = this.paramBinder.getResizeAllValue();
        let formData = new FormData();
        let params = [];
        for(let item of toUpload){
            formData.append('files', item.file);
            if(item.fieldset){
                params.push(this.paramBinder.buildFileParams(item, resizeAllValue));
            }
        }
        formData.append('tilesetParams', JSON.stringify(params));
        let response = await fetch('upload', { method: 'POST', body: formData });
        let reader = response.body.getReader();
        let decoder = new TextDecoder();
        let buffer = '';
        for(let chunk = await reader.read(); !chunk.done; chunk = await reader.read()){
            buffer += decoder.decode(chunk.value, { stream: true });
            let parts = buffer.split('\n\n');
            buffer = parts.pop();
            await this.processChunkParts(parts, messageEl);
        }
    }

    async processChunkParts(parts, messageEl)
    {
        for(let part of parts){
            await this.handleStreamEvent(part, messageEl);
        }
    }


    bind()
    {
        this.fileInput = this.app.getElement('#file-input');
        this.paramsContainer = this.app.getElement('.tileset-params');
        this.paramBinder = new TilesetParamBinder(this.app);
        let form = this.app.getElement('.upload-form');
        this.paramBinder.bindResizeAll();
        this.fileInput.addEventListener('change', () =>
            this.paramBinder.onFileChange(this.fileInput, this.paramsContainer)
        );
        form.addEventListener('submit', (e) =>
            this.onFormSubmit(e, this.fileInput, this.paramsContainer)
        );
    }

    async handleStreamEvent(eventText, messageEl)
    {
        let parsed = SharedUtils.parseSSEEvent(eventText);
        if(!parsed){
            return;
        }
        let {eventType, data} = parsed;
        if('progress' === eventType){
            if('analyzing' === data.status){
                let current = data.cluster || data.element;
                let label = data.phase === 2 ? 'element' : 'cluster';
                messageEl.textContent =
                    'Naming '+label+' '+current+'/'+data.total+' in '+data.file+'...';
                return;
            }
            messageEl.textContent = 'Analyzing '+data.file+'... '+data.tokens+' tokens';
            return;
        }
        if('error' === eventType){
            messageEl.textContent = 'Error: '+data.message;
            return;
        }
        if('done' === eventType){
            if(!data.tilesets){
                return;
            }
            messageEl.classList.add('hidden');
            let overrideFilenames = new Set();
            for(let item of this.pendingUpload){
                if(item.isOverride){
                    overrideFilenames.add(item.file.name);
                }
            }
            if(this.app.state.length){
                if(overrideFilenames.size){
                    this.app.stateBuilder.appendOrReplace(data, overrideFilenames);
                    this.resetForm();
                    this.app.showReviewSection();
                    return;
                }
                this.app.stateBuilder.append(data);
                this.resetForm();
                this.app.showReviewSection();
                await this.app.sessions.autoSave();
                return;
            }
            this.app.stateBuilder.build(data);
            this.resetForm();
            this.app.showReviewSection();
            await this.app.sessions.autoSave();
        }
    }
}
