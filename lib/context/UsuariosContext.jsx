'use client'

import { useState, useEffect, createContext } from 'react';
import { triggerUsuariosGlobais } from '@/lib/firestoreFunctions'
import { useAuth } from '@/lib/authContext'

export const UsuariosContext = createContext();

export function UsuariosProvider({ children }) {
    const [usuarios, setUsuarios] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setUsuarios([]);
            return;
        }

        let unsubscribe;

        const handleData = (dados) => setUsuarios(dados);
        const handleError = (err) => console.error(err);

        unsubscribe = triggerUsuariosGlobais(handleData, handleError);

        return () => unsubscribe && unsubscribe();
    }, [user]);

    return (
        <UsuariosContext.Provider value={{ usuarios }}>
            {children}
        </UsuariosContext.Provider>
    );
}