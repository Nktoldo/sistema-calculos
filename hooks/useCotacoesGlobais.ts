'use client';

import { useContext } from 'react';
import { CotacoesContext } from '../lib/context/CotacoesContext';

export function useCotacoes() {
    const context = useContext(CotacoesContext);
    
    if (!context) {
        throw new Error('useCotacoes deve ser usado dentro de um CotacoesProvider');
    }
    
    return context; 
}