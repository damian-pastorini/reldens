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

    static nextDuplicateName(existingNames, elementKey, sourceSuffix)
    {
        let suffix = '-'+sourceSuffix;
        let max = 0;
        for(let name of existingNames){
            let version = ElementNameSuffix.duplicateVersion(name, elementKey, suffix);
            if(version > max){
                max = version;
            }
        }
        return elementKey+(max + 1)+suffix;
    }

    static duplicateVersion(name, elementKey, suffix)
    {
        if(!name.startsWith(elementKey)){
            return 0;
        }
        if(!name.endsWith(suffix)){
            return 0;
        }
        let versionStr = name.slice(elementKey.length, name.length - suffix.length);
        if(!/^\d+$/.test(versionStr)){
            return 0;
        }
        return Number(versionStr);
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
