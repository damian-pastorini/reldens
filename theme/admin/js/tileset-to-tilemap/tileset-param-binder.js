class TilesetParamBinder
{
    constructor(app)
    {
        this.app = app;
    }

    isFilenameDuplicate(filename)
    {
        for(let tileset of this.app.state){
            if(tileset.filename === filename){
                return true;
            }
        }
        return false;
    }

    detectBgColor(file, callback)
    {
        let url = URL.createObjectURL(file);
        let img = new Image();
        img.onload = () => {
            let canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            let samples = [];
            let step = Math.max(1, Math.floor(Math.min(w, h) / 16));
            for(let x = 0; x < w; x += step){
                let top = ctx.getImageData(x, 0, 1, 1).data;
                let bot = ctx.getImageData(x, h - 1, 1, 1).data;
                samples.push([top[0], top[1], top[2]]);
                samples.push([bot[0], bot[1], bot[2]]);
            }
            for(let y = 0; y < h; y += step){
                let left = ctx.getImageData(0, y, 1, 1).data;
                let right = ctx.getImageData(w - 1, y, 1, 1).data;
                samples.push([left[0], left[1], left[2]]);
                samples.push([right[0], right[1], right[2]]);
            }
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
            if(!best){
                callback('#000000');
                return;
            }
            let toHex = (v) => v.toString(16).padStart(2, '0');
            callback('#'+toHex(best[0])+toHex(best[1])+toHex(best[2]));
        };
        img.onerror = () => callback('#000000');
        img.src = url;
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
            return Number(document.querySelector('.resize-all-custom').value) || 0;
        }
        return Number(checked.value);
    }

    getResizeSpecificValue(fieldset)
    {
        let checked = fieldset.querySelector('.resize-specific-radio:checked');
        if(!checked || '0' === checked.value){
            return 0;
        }
        if('custom' === checked.value){
            return Number(fieldset.querySelector('.resize-specific-custom').value) || 0;
        }
        return Number(checked.value);
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

    bindResizeAll()
    {
        let section = this.app.getElement('.resize-all-section');
        this.buildResizeOptions(section, 'resize-all-radio', 'resize-all', 'resize-all-custom');
        let radios = section.querySelectorAll('.resize-all-radio');
        let customInput = section.querySelector('.resize-all-custom');
        for(let radio of radios){
            radio.addEventListener('change', () => {
                if('0' === radio.value){
                    return;
                }
                this.clearAllSpecificResizes();
            });
        }
        customInput.addEventListener('focus', () => {
            let customRadio = section.querySelector('.resize-all-radio[value="custom"]');
            if(!customRadio.checked){
                customRadio.checked = true;
                this.clearAllSpecificResizes();
            }
        });
    }

    bindResizeSpecific(fieldset)
    {
        let radios = fieldset.querySelectorAll('.resize-specific-radio');
        let customInput = fieldset.querySelector('.resize-specific-custom');
        for(let radio of radios){
            radio.addEventListener('change', () => {
                if('0' === radio.value){
                    return;
                }
                this.clearResizeAll();
            });
        }
        customInput.addEventListener('focus', () => {
            let customRadio = fieldset.querySelector('.resize-specific-radio[value="custom"]');
            if(!customRadio.checked){
                customRadio.checked = true;
                this.clearResizeAll();
            }
        });
    }

    bindParamItemLock(lockBtn, widthInput, heightInput, lockIcon)
    {
        lockBtn.addEventListener('click', () => {
            lockBtn.classList.toggle('locked');
            let isLocked = lockBtn.classList.contains('locked');
            lockIcon.src = '/assets/admin/'+(isLocked ? 'lock-solid' : 'unlock-solid')+'.svg';
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
        for(let btn of presetBtns){
            btn.addEventListener('click', () => {
                let size = Number(btn.dataset.size);
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
        let lockIcon = lockBtn.querySelector('.lock-icon');
        let bgColorInput = clone.querySelector('.param-bg-color');
        this.bindParamItemLock(lockBtn, widthInput, heightInput, lockIcon);
        this.bindParamItemPresets(clone.querySelectorAll('.tile-preset-btn'), widthInput, heightInput);
        this.buildResizeOptions(
            clone.querySelector('.resize-specific-section'),
            'resize-specific-radio',
            'resize-specific-'+i,
            'resize-specific-custom'
        );
        this.bindResizeSpecific(clone.querySelector('.tileset-param-fieldset'));
        this.detectBgColor(file, (hex) => { bgColorInput.value = hex; });
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
        let resizeSpecific = this.getResizeSpecificValue(item.fieldset);
        return {
            tileWidth: Number(item.fieldset.querySelector('.param-tile-width').value),
            tileHeight: Number(item.fieldset.querySelector('.param-tile-height').value),
            spacing: Number(item.fieldset.querySelector('.param-spacing').value),
            margin: Number(item.fieldset.querySelector('.param-margin').value),
            bgColor: item.fieldset.querySelector('.param-bg-color').value || '#000000',
            resizeValue: resizeSpecific || resizeAllValue
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
