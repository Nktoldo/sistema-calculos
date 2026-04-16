'use client';

import { useContext } from 'react';
import { UsuariosContext } from '../lib/context/UsuariosContext'

export function useUsuarios() {
  const context = useContext(UsuariosContext);
    
  if (!context) {
      throw new Error('useCotacoes deve ser usado dentro de um CotacoesProvider');
  }
  
  return context; 
}