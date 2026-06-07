class ElementNameSuffix
{
    static padNum(n)
    {
        return (''+n).padStart(3, '0');
    }

    static maxSuffix(existingNames, prefix)
    {
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
        return base+'-'+ElementNameSuffix.padNum(ElementNameSuffix.maxSuffix(existingNames, base+'-') + 1);
    }

    static nextFusedSuffix(existingNames, base)
    {
        return base+(ElementNameSuffix.maxSuffix(existingNames, base) + 1);
    }

    static resolveUnique(existingNames, name)
    {
        if(-1 === existingNames.indexOf(name)){
            return name;
        }
        return name+'-'+ElementNameSuffix.padNum(ElementNameSuffix.maxSuffix(existingNames, name+'-') + 1);
    }
}
window.ElementNameSuffix = ElementNameSuffix;
