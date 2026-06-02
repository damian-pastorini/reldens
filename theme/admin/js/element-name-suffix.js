class ElementNameSuffix
{
    static padNum(n)
    {
        return (''+n).padStart(3, '0');
    }

    static maxSuffix(existingNames, base)
    {
        let prefix = base+'-';
        let max = 0;
        for(let name of existingNames){
            if(!name.startsWith(prefix)){
                continue;
            }
            let suffixStr = name.slice(prefix.length);
            if(!/^\d+$/.test(suffixStr)){
                continue;
            }
            let suffix = Number(suffixStr);
            if(suffix > max){
                max = suffix;
            }
        }
        return max;
    }

    static nextSuffix(existingNames, base)
    {
        return base+'-'+ElementNameSuffix.padNum(ElementNameSuffix.maxSuffix(existingNames, base) + 1);
    }

    static parseSuffix(name)
    {
        let match = name.match(/-(\d+)$/);
        return match ? Number(match[1]) : 0;
    }

    static resolveUnique(existingNames, name)
    {
        if(-1 === existingNames.indexOf(name)){
            return name;
        }
        return name+'-'+ElementNameSuffix.padNum(ElementNameSuffix.maxSuffix(existingNames, name) + 1);
    }
}
window.ElementNameSuffix = ElementNameSuffix;
