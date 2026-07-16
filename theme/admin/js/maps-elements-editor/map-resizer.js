class MapResizer
{
    constructor(editor)
    {
        this.editor = editor;
        this.anchorKeys = [
            'top-left', 'top-center', 'top-right',
            'left', 'center', 'right',
            'bottom-left', 'bottom-center', 'bottom-right'
        ];
        this.anchor = 'center';
        this.removeHorizontal = 0;
        this.removeVertical = 0;
        this.previewActive = false;
        this.anchorButtons = {};
        this.horizontalInput = null;
        this.verticalInput = null;
        this.errorEl = null;
        this.forceButton = null;
    }

    buildPanelInto(panel)
    {
        let picker = document.createElement('div');
        picker.className = 'resize-anchor-picker';
        for(let key of this.anchorKeys){
            picker.appendChild(this.buildAnchorButton(key));
        }
        panel.appendChild(picker);
        this.horizontalInput = this.buildNumberInput('Remove horizontal', 0);
        panel.appendChild(this.horizontalInput.wrapper);
        this.verticalInput = this.buildNumberInput('Remove vertical', 0);
        panel.appendChild(this.verticalInput.wrapper);
        this.errorEl = document.createElement('p');
        this.errorEl.className = 'resize-error hidden';
        panel.appendChild(this.errorEl);
        panel.appendChild(this.editor.ui.buildButton(
            'Apply resize',
            'button-primary',
            () => this.requestResize(false)
        ));
        this.forceButton = this.editor.ui.buildButton(
            'Force resize',
            'button-danger hidden',
            () => this.requestResize(true)
        );
        panel.appendChild(this.forceButton);
        this.highlightAnchor(this.anchor);
    }

    showResult(result)
    {
        if(!this.errorEl){
            return;
        }
        if(result.success){
            this.errorEl.classList.add('hidden');
            this.errorEl.textContent = '';
            this.toggleForceButton(false);
            return;
        }
        this.errorEl.classList.remove('hidden');
        if(result.offending && 0 < result.offending.length){
            this.errorEl.textContent = 'Cannot resize: these elements would fall outside the new bounds: '
                +result.offending.join(', ')
                +'. Use "Force resize" to crop the map anyway (their outside tiles will be removed).';
            this.toggleForceButton(true);
            return;
        }
        this.showError('Resize failed.');
    }

    showError(message)
    {
        if(!this.errorEl){
            return;
        }
        this.errorEl.classList.remove('hidden');
        this.errorEl.textContent = message;
        this.toggleForceButton(false);
    }

    toggleForceButton(show)
    {
        if(!this.forceButton){
            return;
        }
        this.forceButton.classList.toggle('hidden', !show);
    }

    buildAnchorButton(key)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = 'resize-anchor-picker-cell';
        button.dataset.anchorKey = key;
        button.title = key;
        button.addEventListener('click', () => this.highlightAnchor(key));
        this.anchorButtons[key] = button;
        return button;
    }

    buildNumberInput(label, initial)
    {
        let wrapper = document.createElement('label');
        wrapper.textContent = label+': ';
        let input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = String(initial);
        input.addEventListener('input', () => this.refreshPreview());
        wrapper.appendChild(input);
        return {wrapper, input};
    }

    highlightAnchor(key)
    {
        this.anchor = key;
        for(let anchorKey of this.anchorKeys){
            let button = this.anchorButtons[anchorKey];
            if(!button){
                continue;
            }
            button.classList.toggle('selected', anchorKey === key);
        }
        this.editor.requestRender();
    }

    readInputs()
    {
        this.removeHorizontal = this.clampAmount(this.horizontalInput.input.value);
        this.removeVertical = this.clampAmount(this.verticalInput.input.value);
    }

    clampAmount(value)
    {
        let amount = Number(value);
        if(!Number.isFinite(amount) || 0 > amount){
            return 0;
        }
        return Math.floor(amount);
    }

    refreshPreview()
    {
        this.readInputs();
        this.editor.requestRender();
    }

    computeRemovals(anchor, removeHorizontal, removeVertical)
    {
        return {
            left: this.anchoredRemoval(
                removeHorizontal,
                -1 !== anchor.indexOf('right'),
                -1 !== anchor.indexOf('center')
            ),
            top: this.anchoredRemoval(
                removeVertical,
                -1 !== anchor.indexOf('bottom'),
                -1 === anchor.indexOf('top') && -1 === anchor.indexOf('bottom')
            )
        };
    }

    anchoredRemoval(total, removeFromFarSide, removeCentered)
    {
        if(removeFromFarSide){
            return total;
        }
        if(removeCentered){
            return Math.floor(total / 2);
        }
        return 0;
    }

    previewBands()
    {
        if(!this.previewActive || !this.editor.mapJson){
            return false;
        }
        if(0 === this.removeHorizontal && 0 === this.removeVertical){
            return false;
        }
        let newWidth = this.editor.mapJson.width - this.removeHorizontal;
        let newHeight = this.editor.mapJson.height - this.removeVertical;
        if(0 >= newWidth || 0 >= newHeight){
            return false;
        }
        let bands = this.computeRemovals(this.anchor, this.removeHorizontal, this.removeVertical);
        bands.newWidth = newWidth;
        bands.newHeight = newHeight;
        return bands;
    }

    async requestResize(force)
    {
        this.readInputs();
        if(!this.editor.dirty){
            await this.applyResize(force);
            return;
        }
        if('room' !== this.editor.context){
            await this.saveAndApplyResize(force);
            return;
        }
        adminFunctions.showConfirmDialog(async (confirmed) => {
            if(!confirmed){
                return;
            }
            await this.saveAndApplyResize(force);
        }, this.editor.confirmations.saveConfirmOptions());
    }

    async saveAndApplyResize(force)
    {
        let result = await this.editor.save();
        if(!result.success){
            this.showError('Cannot resize: the pending map changes could not be saved.');
            return;
        }
        await this.applyResize(force);
    }

    async applyResize(force)
    {
        let response = await this.editor.jsonFetcher.post(this.editor.apiBasePath+'/resize-map', this.buildBody(force));
        if(response && response.success){
            this.horizontalInput.input.value = '0';
            this.verticalInput.input.value = '0';
            this.readInputs();
            await this.editor.load();
        }
        this.showResult(response);
    }

    buildBody(force)
    {
        return JSON.stringify({
            mapName: this.editor.mapName,
            sessionId: this.editor.sessionId,
            context: this.editor.context,
            anchor: this.anchor,
            removeHorizontal: this.removeHorizontal,
            removeVertical: this.removeVertical,
            force: force
        });
    }
}
window.MapResizer = MapResizer;
