class MapsWizardGenerateGuard
{
    constructor()
    {
        this.formId = 'maps-wizard-form';
        this.apiPath = '/maps-wizard/api/rooms-exist';
        this.lastParseError = null;
        this.bind();
    }

    bind()
    {
        document.addEventListener('submit', (event) => this.onSubmitCapture(event), true);
    }

    onSubmitCapture(event)
    {
        let form = event.target;
        if(!form || this.formId !== form.id){
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        this.confirmGenerate(form);
    }

    confirmGenerate(form)
    {
        let names = this.collectManualMapNames();
        if(0 === names.length){
            this.runConfirm(form, this.buildGenerateOptions());
            return;
        }
        this.checkRoomsAndConfirm(form, names);
    }

    collectManualMapNames()
    {
        let raw = window.mapsWizardUtils ? window.mapsWizardUtils.readGeneratorDataValue() : '';
        if(!raw){
            return [];
        }
        let data = null;
        try {
            data = JSON.parse(raw); // HOFF
        } catch(error){
            this.lastParseError = error;
            return [];
        }
        let names = [];
        this.collectName(names, data.mapName);
        this.collectListNames(names, data.mapNames);
        this.collectInfoNames(names, data.mapsInformation);
        return names;
    }

    collectName(names, value)
    {
        if('string' !== typeof value){
            return;
        }
        let name = value.trim();
        if(!name){
            return;
        }
        if(-1 === names.indexOf(name)){
            names.push(name);
        }
    }

    collectListNames(names, value)
    {
        let list = value;
        if('string' === typeof value){
            list = value.split(',');
        }
        if(!Array.isArray(list)){
            return;
        }
        for(let item of list){
            this.collectName(names, item);
        }
    }

    collectInfoNames(names, value)
    {
        if(!Array.isArray(value)){
            return;
        }
        for(let item of value){
            if(item){
                this.collectName(names, item.mapName);
            }
        }
    }

    checkRoomsAndConfirm(form, names)
    {
        fetch(this.apiUrl(form, names))
            .then((response) => response.json())
            .then((data) => this.onRoomsChecked(form, data))
            .catch(() => this.runConfirm(form, this.buildGenerateOptions()));
    }

    apiUrl(form, names)
    {
        let action = form.getAttribute('action');
        if(!action){
            action = '';
        }
        return action.replace('/maps-wizard', '')+this.apiPath+'?names='+encodeURIComponent(names.join(','));
    }

    onRoomsChecked(form, data)
    {
        let existing = (data && Array.isArray(data.existing)) ? data.existing : [];
        if(0 === existing.length){
            this.runConfirm(form, this.buildGenerateOptions());
            return;
        }
        this.runConfirm(form, this.buildOverrideOptions(existing));
    }

    buildGenerateOptions()
    {
        return {
            title: 'Generate Maps',
            message: 'Generate the map(s) now?',
            confirmText: 'Generate',
            cancelText: 'Cancel',
            confirmClass: 'button-primary'
        };
    }

    buildOverrideOptions(existing)
    {
        return {
            title: 'Map name already exists',
            message: 'The session has a specific map name on it which already exists ('
                +existing.join(', ')+'), do you want to override it?',
            messageClass: 'alert',
            confirmText: 'Override',
            cancelText: 'Cancel',
            confirmClass: 'button-danger'
        };
    }

    runConfirm(form, options)
    {
        adminFunctions.showConfirmDialog((confirmed) => {
            if(!confirmed){
                return;
            }
            form.submit();
        }, options);
    }
}
window.MapsWizardGenerateGuard = MapsWizardGenerateGuard;
