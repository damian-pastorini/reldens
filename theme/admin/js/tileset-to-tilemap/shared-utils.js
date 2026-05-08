class SharedUtils
{
    static ELEMENT_TYPE = 'element';
    static CLUSTER_TYPE = 'cluster';
    static SPOT_TYPE = 'spot';
    static SPOT_POSITIONAL_KEYS = [
        'surroundingTiles', 'corners', 'bordersTiles', 'borderCornersTiles',
        'innerWallsTiles', 'innerWallsCornerTiles', 'outerWallsTiles', 'outerWallsCornerTiles'
    ];

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

    static buildSessionTimestamp()
    {
        return new Date().getFullYear()
            +'-'+String(new Date().getMonth()+1).padStart(2, '0')
            +'-'+String(new Date().getDate()).padStart(2, '0')
            +'-'+String(new Date().getHours()).padStart(2, '0')
            +'-'+String(new Date().getMinutes()).padStart(2, '0')
            +'-'+String(new Date().getSeconds()).padStart(2, '0');
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
        } catch {
            return null;
        }
        return {eventType, data};
    }
}
window.SharedUtils = SharedUtils;
