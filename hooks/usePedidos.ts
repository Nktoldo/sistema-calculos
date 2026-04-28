'use client';

import { useContext } from 'react';
import { PedidosContext } from '../lib/context/PedidosContext';

export function usePedidos() {
    const context = useContext(PedidosContext);
    
    if (!context) {
        throw new Error('usePedidos deve ser usado dentro de um PedidosProvider');
    }
    
    return context; 
}