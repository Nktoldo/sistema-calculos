'use client'

import {  useState, useEffect, createContext } from 'react';
import { triggerCotacoesGlobaisAdmin, triggerCotacoesUsuario  } from '@/lib/firestoreFunctions'
import { useAuth } from '@/lib/authContext'

export const CotacoesContext = createContext();

export function CotacoesProvider({ children }) {
    const [cotacoes, setCotacoes] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setCotacoes([]);
            return;
        }

        let unsubscribe;

        const handleData = (dados) => setCotacoes(dados);
        const handleError = (err) => console.error(err);

        if (user.role === "admin") {
            unsubscribe = triggerCotacoesGlobaisAdmin(user.empresa, handleData, handleError);
        } else {
            unsubscribe = triggerCotacoesUsuario(user.empresa, user.uid, handleData, handleError);
        }

        return () => unsubscribe && unsubscribe();
    }, [user]);

    return (
        <CotacoesContext.Provider value={{ cotacoes }}>
            {children}
        </CotacoesContext.Provider>
    );
}