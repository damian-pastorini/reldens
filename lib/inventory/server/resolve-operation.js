/**
 *
 * Reldens - ResolveOperation
 *
 */

const { ModifierConst } = require('@reldens/modifiers');

class ResolveOperation
{

    static prefix(operation)
    {
        if(ModifierConst.OPS.INC === operation || ModifierConst.OPS.INC_P === operation){
            return '+';
        }
        if(ModifierConst.OPS.DEC === operation || ModifierConst.OPS.DEC_P === operation){
            return '-';
        }
        if(ModifierConst.OPS.MUL === operation){
            return '*';
        }
        if(ModifierConst.OPS.DIV === operation){
            return '/';
        }
        return '=';
    }

    static suffix(operation)
    {
        if(ModifierConst.OPS.INC_P === operation || ModifierConst.OPS.DEC_P === operation){
            return '%';
        }
        return '';
    }

}

module.exports.ResolveOperation = ResolveOperation;
