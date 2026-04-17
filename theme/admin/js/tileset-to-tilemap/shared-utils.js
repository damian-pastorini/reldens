class SharedUtils
{
    static ELEMENT_TYPE = 'element';
    static CLUSTER_TYPE = 'cluster';
    static SPOT_TYPE = 'spot';

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
        let now = new Date();
        let pad = (n) => String(n).padStart(2, '0');
        return now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())
            +'-'+pad(now.getHours())+'-'+pad(now.getMinutes())+'-'+pad(now.getSeconds());
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
        } catch(parseError) {
            return null;
        }
        return {eventType, data};
    }
}
