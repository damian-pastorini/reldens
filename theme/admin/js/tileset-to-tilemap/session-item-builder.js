class SessionItemBuilder
{
    constructor(manager)
    {
        this.manager = manager;
    }

    build(sessionId, files, expanded)
    {
        let li = document.createElement('li');
        li.dataset.sessionId = sessionId;
        if(expanded){
            li.classList.add('expanded');
        }
        let header = document.createElement('div');
        header.className = 'generated-file-header';
        let collapseIcon = document.createElement('img');
        collapseIcon.className = 'generated-file-collapse-icon';
        collapseIcon.src = '/assets/admin/circle-chevron-up-solid-full.svg';
        collapseIcon.alt = '';
        header.appendChild(collapseIcon);
        let span = document.createElement('span');
        span.className = 'generated-file-id';
        span.textContent = sessionId;
        header.appendChild(span);
        let hasConfig = false;
        let hasMapsConfig = false;
        let outputFiles = [];
        let inputFiles = [];
        for(let file of files){
            if('session-editor-state.json' === file.name){
                hasConfig = true;
                continue;
            }
            if('map-generator-config.json' === file.name){
                hasMapsConfig = true;
            }
            if('input' === file.type){
                inputFiles.push(file);
                continue;
            }
            outputFiles.push(file);
        }
        if(hasConfig){
            let loadBtn = document.createElement('button');
            loadBtn.className = 'button button-sm button-primary generated-file-load-btn';
            loadBtn.textContent = 'Load';
            loadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.manager.loadSession(sessionId);
            });
            header.appendChild(loadBtn);
        }
        if(hasMapsConfig){
            let wizardBtn = document.createElement('a');
            wizardBtn.className = 'button button-sm button-success generated-file-wizard-btn';
            let analyzer = document.querySelector('.tileset-analyzer');
            let mapsWizardPath = analyzer ? analyzer.dataset.mapsWizardPath : '/maps-wizard';
            wizardBtn.href = mapsWizardPath+'?tilesetSessionId='+sessionId;
            wizardBtn.textContent = 'Maps Wizard';
            wizardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            header.appendChild(wizardBtn);
        }
        let deleteBtn = document.createElement('button');
        deleteBtn.className = 'button button-sm button-danger generated-file-delete-btn';
        let deleteImg = document.createElement('img');
        deleteImg.src = '/assets/admin/trash-can-solid-full.svg';
        deleteImg.alt = 'Delete';
        deleteBtn.appendChild(deleteImg);
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.manager.delete(sessionId, li);
        });
        header.appendChild(deleteBtn);
        li.appendChild(header);
        let filesDiv = document.createElement('div');
        filesDiv.className = expanded ? 'generated-file-content' : 'generated-file-content hidden';
        if(outputFiles.length){
            filesDiv.appendChild(this.buildFilesGroup('Output', outputFiles));
        }
        if(inputFiles.length){
            filesDiv.appendChild(this.buildFilesGroup('Input', inputFiles));
        }
        li.appendChild(filesDiv);
        li.addEventListener('click', () => {
            let isExpanded = li.classList.toggle('expanded');
            filesDiv.classList.toggle('hidden');
            collapseIcon.src = '/assets/admin/'+(isExpanded
                ? 'circle-chevron-down-solid-full'
                : 'circle-chevron-up-solid-full')+'.svg';
        });
        return li;
    }

    buildFilesGroup(label, files)
    {
        let group = document.createElement('div');
        group.className = 'generated-file-group';
        let labelEl = document.createElement('span');
        labelEl.className = 'generated-file-group-label';
        labelEl.textContent = label;
        group.appendChild(labelEl);
        let grid = document.createElement('div');
        grid.className = 'generated-file-grid';
        for(let file of files){
            let a = document.createElement('a');
            a.href = file.downloadUrl;
            a.textContent = file.name;
            a.download = file.name;
            grid.appendChild(a);
        }
        group.appendChild(grid);
        return group;
    }
}
