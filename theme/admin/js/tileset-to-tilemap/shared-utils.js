class SharedUtils
{
    static ELEMENT_TYPE = 'element';
    static CLUSTER_TYPE = 'cluster';
    static SPOT_TYPE = 'spot';
    static DEFAULT_LAYER_TYPE = 'below-player';
    static DEFAULT_GENERATOR_TYPE = 'elements-composite-loader';
    static MOUSE_BUTTON_RIGHT = 2;
    static SPOT_POSITIONAL_KEYS = [
        'surroundingTiles', 'corners', 'bordersTiles', 'borderCornersTiles',
        'innerWallsTiles', 'innerWallsCornerTiles', 'outerWallsTiles', 'outerWallsCornerTiles'
    ];
    static KNOWN_LAYER_TYPES = [
        'below-player', 'collisions', 'over-player', 'collisions-over-player', 'base', 'path'
    ];
    static LAYER_TYPE_COLORS = {
        'over-player': '#5b8cff',
        'collisions': '#ff5b5b',
        'collisions-over-player': '#ff5bff',
        'base': '#d4a017',
        'below-player': '#5bff8c',
        'path': '#f0a040'
    };
    static ICON_PATHS = {
        lockSolid: '/assets/admin/lock-solid.svg',
        unlockSolid: '/assets/admin/unlock-solid.svg',
        cube: '/assets/admin/cube-solid-full.svg',
        cubes: '/assets/admin/cubes-solid-full.svg',
        trash: '/assets/admin/trash-can-solid-full.svg',
        chevronUp: '/assets/admin/circle-chevron-up-solid-full.svg'
    };
    static SPOT_DEFAULTS = {
        width: 5,
        height: 5,
        markPercentage: 100,
        variableTilesPercentage: 0,
        borderOuterWallsIncreaseLayerSize: 4
    };
    static TILESET_SCHEMA_FIELDS = [
        'imageId', 'imageUrl', 'filename', 'filePath',
        'imageWidth', 'imageHeight', 'tileWidth', 'tileHeight',
        'spacing', 'margin', 'tilesetColumns', 'tileRows', 'tileCount'
    ];
    static NAME_VALID_REGEX = /^[a-z]+(?:-[a-z]+)*-\d+(?:-\d+)*$/;
    static NAME_PARSE_REGEX = /^([a-z]+(?:-[a-z]+)*)-(\d+)$/;
    static SESSION_TIMESTAMP_REGEX = /^(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/;
    static SESSION_NAME_SUFFIX_REGEX = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-?(.*)$/;

    static colorForIndex(index)
    {
        return 'hsl('+Math.round((index * 137.508) % 360)+',70%,55%)';
    }

    static tileKey(tile)
    {
        return tile[0]+','+tile[1];
    }

    static padNum(n)
    {
        return (''+n).padStart(3, '0');
    }

    static toNumber(value, defaultValue)
    {
        let fallback = undefined === defaultValue ? 0 : defaultValue;
        if('' === value || null === value || undefined === value){
            return fallback;
        }
        let parsed = Number(value);
        if(isNaN(parsed)){
            return fallback;
        }
        return parsed;
    }

    static isSet(value)
    {
        return null !== value && undefined !== value;
    }

    static applyLockVisual(button, locked)
    {
        if(!button){
            return;
        }
        button.classList.toggle('locked', locked);
        let icon = button.querySelector('.lock-icon');
        if(icon){
            icon.src = locked ? SharedUtils.ICON_PATHS.lockSolid : SharedUtils.ICON_PATHS.unlockSolid;
        }
    }

    static copyTilesetFields(target, source)
    {
        for(let field of SharedUtils.TILESET_SCHEMA_FIELDS){
            target[field] = source[field];
        }
        return target;
    }

    static filenameToMapName(filename)
    {
        return filename.replace(/\.[^.]+$/, '').toLowerCase().replace(/[\s_]+/g, '-');
    }

    static filenameToMapTitle(filename)
    {
        return filename.replace(/\.[^.]+$/, '');
    }

    static makeElement(name, colorIndex, layers, approved, type)
    {
        return {
            name,
            type: type || SharedUtils.ELEMENT_TYPE,
            approved: approved !== undefined ? approved : false,
            quantity: 1,
            freeSpaceAround: 1,
            allowPathsInFreeSpace: false,
            bulkSelected: false,
            colorIndex,
            layers: layers || []
        };
    }

    static populateProviderSelect(selectEl, providers)
    {
        for(let provider of providers){
            let option = document.createElement('option');
            option.value = provider;
            let label = provider.charAt(0).toUpperCase()+provider.slice(1);
            if(provider.startsWith('ollama:')){
                label = 'Ollama ('+provider.slice(7)+')';
            }
            option.textContent = label;
            selectEl.appendChild(option);
        }
    }

    static formatDateForSession(date)
    {
        return date.getFullYear()
            +'-'+String(date.getMonth()+1).padStart(2, '0')
            +'-'+String(date.getDate()).padStart(2, '0')
            +'-'+String(date.getHours()).padStart(2, '0')
            +'-'+String(date.getMinutes()).padStart(2, '0')
            +'-'+String(date.getSeconds()).padStart(2, '0');
    }

    static buildSessionTimestamp()
    {
        return SharedUtils.formatDateForSession(new Date());
    }

    static buildSessionId(baseSessionId, override, name)
    {
        let trimmedName = name ? name.trim() : '';
        if(override){
            if(!trimmedName){
                return baseSessionId;
            }
            let match = baseSessionId.match(SharedUtils.SESSION_TIMESTAMP_REGEX);
            return (match ? match[1] : baseSessionId)+'-'+trimmedName;
        }
        let timestamp = SharedUtils.buildSessionTimestamp();
        if(!trimmedName){
            return timestamp;
        }
        return timestamp+'-'+trimmedName;
    }

    static async dispatchSseParts(parts, handleEvent)
    {
        for(let part of parts){
            await handleEvent(part);
        }
    }

    static async readSseStream(response, handleEvent)
    {
        let reader = response.body.getReader();
        let decoder = new TextDecoder();
        let buffer = '';
        for(let chunk = await reader.read(); !chunk.done; chunk = await reader.read()){
            buffer += decoder.decode(chunk.value, { stream: true });
            let parts = buffer.split('\n\n');
            buffer = parts.pop();
            await SharedUtils.dispatchSseParts(parts, handleEvent);
        }
    }

    static parseSSEEvent(eventText)
    {
        let eventType = '';
        let dataStr = '';
        for(let line of eventText.split('\n')){
            if(line.startsWith('event: ')){
                eventType = line.slice(7).trim();
            }
            if(line.startsWith('data: ')){
                dataStr = line.slice(6).trim();
            }
        }
        if(!dataStr){
            return null;
        }
        let data = null;
        try {
            data = JSON.parse(dataStr);
        } catch(error) {
            return {eventType, data: null, parseError: error.message};
        }
        return {eventType, data};
    }
}
window.SharedUtils = SharedUtils;
