class TilesetParamBinder
{
    constructor(app)
    {
        this.app = app;
    }

    isFilenameDuplicate(filename)
    {
        return -1 !== this.app.findTilesetIndexByFilename(filename);
    }

    sampleEdgePixels(ctx, w, h, step)
    {
        let topRow = ctx.getImageData(0, 0, w, 1).data;
        let bottomRow = ctx.getImageData(0, h - 1, w, 1).data;
        let leftCol = ctx.getImageData(0, 0, 1, h).data;
        let rightCol = ctx.getImageData(w - 1, 0, 1, h).data;
        let samples = [];
        for(let x = 0; x < w; x += step){
            let i = x * 4;
            samples.push([topRow[i], topRow[i + 1], topRow[i + 2]]);
            samples.push([bottomRow[i], bottomRow[i + 1], bottomRow[i + 2]]);
        }
        for(let y = 0; y < h; y += step){
            let i = y * 4;
            samples.push([leftCol[i], leftCol[i + 1], leftCol[i + 2]]);
            samples.push([rightCol[i], rightCol[i + 1], rightCol[i + 2]]);
        }
        return samples;
    }

    pickDominantColor(samples)
    {
        let counts = {};
        let best = null;
        let bestCount = 0;
        for(let s of samples){
            let r = Math.round(s[0] / 8) * 8;
            let g = Math.round(s[1] / 8) * 8;
            let b = Math.round(s[2] / 8) * 8;
            let key = r+','+g+','+b;
            counts[key] = (counts[key] || 0) + 1;
            if(counts[key] > bestCount){
                bestCount = counts[key];
                best = [r, g, b];
            }
        }
        return best;
    }

    detectBgColorOnLoad(image, url, callback)
    {
        try {
            let canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            let w = image.naturalWidth;
            let h = image.naturalHeight;
            let step = Math.max(1, Math.floor(Math.min(w, h) / 16));
            let samples = this.sampleEdgePixels(ctx, w, h, step);
            let best = this.pickDominantColor(samples);
            if(!best){
                callback('#000000');
                return;
            }
            let toHex = (v) => v.toString(16).padStart(2, '0');
            callback('#'+toHex(best[0])+toHex(best[1])+toHex(best[2]));
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    detectBgColor(file, callback)
    {
        let url = URL.createObjectURL(file);
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => this.detectBgColorOnLoad(image, url, callback);
        image.onerror = () => {
            URL.revokeObjectURL(url);
            callback('#000000');
        };
        image.src = url;
    }

    clearResizeAll()
    {
        let noneRadio = document.querySelector('.resize-all-radio[value="0"]');
        if(noneRadio){
            noneRadio.checked = true;
        }
    }

    clearAllSpecificResizes()
    {
        let noneRadios = document.querySelectorAll('.resize-specific-radio[value="0"]');
        for(let radio of noneRadios){
            radio.checked = true;
        }
    }

    getResizeAllValue()
    {
        let checked = document.querySelector('.resize-all-radio:checked');
        if(!checked || '0' === checked.value){
            return 0;
        }
        if('custom' === checked.value){
            return SharedUtils.toNumber(document.querySelector('.resize-all-custom').value, 0);
        }
        return SharedUtils.toNumber(checked.value, 0);
    }

    getResizeSpecificValue(fieldset)
    {
        let checked = fieldset.querySelector('.resize-specific-radio:checked');
        if(!checked || '0' === checked.value){
            return 0;
        }
        if('custom' === checked.value){
            return SharedUtils.toNumber(fieldset.querySelector('.resize-specific-custom').value, 0);
        }
        return SharedUtils.toNumber(checked.value, 0);
    }

    buildResizeOptions(container, radioClass, radioName, customClass)
    {
        let template = this.app.getElement('.resize-options-template');
        let clone = template.content.cloneNode(true);
        let radios = clone.querySelectorAll('input[type="radio"]');
        for(let radio of radios){
            radio.className = radioClass;
            radio.name = radioName;
        }
        clone.querySelector('input[type="number"]').className = customClass;
        container.appendChild(clone);
    }

    bindResizeRadioGroup(radios, onPickValue)
    {
        for(let radio of radios){
            radio.addEventListener('change', () => {
                if('0' === radio.value){
                    return;
                }
                onPickValue();
            });
        }
    }

    bindResizeCustomFocus(customInput, customRadioSelector, container, onPickValue)
    {
        customInput.addEventListener('focus', () => {
            let customRadio = container.querySelector(customRadioSelector);
            if(!customRadio.checked){
                customRadio.checked = true;
                onPickValue();
            }
        });
    }

    bindResizeAll()
    {
        let section = this.app.getElement('.resize-all-section');
        this.buildResizeOptions(section, 'resize-all-radio', 'resize-all', 'resize-all-custom');
        let radios = section.querySelectorAll('.resize-all-radio');
        let customInput = section.querySelector('.resize-all-custom');
        this.bindResizeRadioGroup(radios, () => this.clearAllSpecificResizes());
        this.bindResizeCustomFocus(
            customInput, '.resize-all-radio[value="custom"]', section, () => this.clearAllSpecificResizes()
        );
    }

    bindResizeSpecific(fieldset)
    {
        let radios = fieldset.querySelectorAll('.resize-specific-radio');
        let customInput = fieldset.querySelector('.resize-specific-custom');
        this.bindResizeRadioGroup(radios, () => this.clearResizeAll());
        this.bindResizeCustomFocus(
            customInput, '.resize-specific-radio[value="custom"]', fieldset, () => this.clearResizeAll()
        );
    }

    bindParamItemLock(lockBtn, widthInput, heightInput)
    {
        lockBtn.addEventListener('click', () => {
            let isLocked = !lockBtn.classList.contains('locked');
            SharedUtils.applyLockVisual(lockBtn, isLocked);
            if(!isLocked){
                return;
            }
            heightInput.value = widthInput.value;
        });
        widthInput.addEventListener('input', () => {
            if(!lockBtn.classList.contains('locked')){
                return;
            }
            heightInput.value = widthInput.value;
        });
        heightInput.addEventListener('input', () => {
            if(!lockBtn.classList.contains('locked')){
                return;
            }
            widthInput.value = heightInput.value;
        });
    }

    bindParamItemPresets(presetBtns, widthInput, heightInput)
    {
        for(let presetButton of presetBtns){
            presetButton.addEventListener('click', () => {
                let size = SharedUtils.toNumber(presetButton.dataset.size, 0);
                widthInput.value = size;
                heightInput.value = size;
            });
        }
    }

    buildParamClone(file, i, paramsContainer)
    {
        let template = this.app.getElement('.tileset-param-template');
        let clone = template.content.cloneNode(true);
        clone.querySelector('.param-filename').textContent = file.name;
        let lockBtn = clone.querySelector('.param-size-lock');
        let widthInput = clone.querySelector('.param-tile-width');
        let heightInput = clone.querySelector('.param-tile-height');
        let bgColorInput = clone.querySelector('.param-bg-color');
        this.bindParamItemLock(lockBtn, widthInput, heightInput);
        this.bindParamItemPresets(clone.querySelectorAll('.tile-preset-btn'), widthInput, heightInput);
        this.buildResizeOptions(
            clone.querySelector('.resize-specific-section'),
            'resize-specific-radio',
            'resize-specific-'+i,
            'resize-specific-custom'
        );
        this.bindResizeSpecific(clone.querySelector('.tileset-param-fieldset'));
        this.detectBgColor(file, (hex) => {
            bgColorInput.value = hex;
        });
        clone.querySelector('.param-override-label').classList.toggle('hidden', !this.isFilenameDuplicate(file.name));
        paramsContainer.appendChild(clone);
    }

    onFileChange(fileInput, paramsContainer)
    {
        this.clearResizeAll();
        paramsContainer.textContent = '';
        let resizeAllSection = this.app.getElement('.resize-all-section');
        resizeAllSection.classList.toggle('hidden', fileInput.files.length < 2);
        for(let i = 0; i < fileInput.files.length; i++){
            this.buildParamClone(fileInput.files[i], i, paramsContainer);
        }
    }

    buildFileParams(item, resizeAllValue)
    {
        return {
            tileWidth: SharedUtils.toNumber(item.fieldset.querySelector('.param-tile-width').value, 0),
            tileHeight: SharedUtils.toNumber(item.fieldset.querySelector('.param-tile-height').value, 0),
            spacing: SharedUtils.toNumber(item.fieldset.querySelector('.param-spacing').value, 0),
            margin: SharedUtils.toNumber(item.fieldset.querySelector('.param-margin').value, 0),
            bgColor: item.fieldset.querySelector('.param-bg-color').value || '#000000',
            resizeValue: this.getResizeSpecificValue(item.fieldset) || resizeAllValue
        };
    }

    buildUploadList(fileInput, paramsContainer)
    {
        let fieldsets = paramsContainer.querySelectorAll('.tileset-param-fieldset');
        let toUpload = [];
        for(let i = 0; i < fileInput.files.length; i++){
            let file = fileInput.files[i];
            let fieldset = fieldsets[i];
            let isDuplicate = this.isFilenameDuplicate(file.name);
            let isOverride = fieldset && fieldset.querySelector('.param-override').checked;
            if(isDuplicate && !isOverride){
                continue;
            }
            toUpload.push({ file, fieldset, isOverride: isDuplicate && isOverride });
        }
        return toUpload;
    }
}
window.TilesetParamBinder = TilesetParamBinder;
