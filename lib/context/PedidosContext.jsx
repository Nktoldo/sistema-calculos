'use client'

import { useState, useEffect, createContext } from 'react';
import { triggerPedidosGlobaisAdmin, triggerPedidosUsuario  } from '@/lib/firestoreFunctions'
import { useAuth } from '@/lib/authContext'

export const PedidosContext = createContext();

export function PedidosProvider({ children }) {
    const [pedidos, setPedidos] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setPedidos([]);
            return;
        }

        let unsubscribe;

        const handleData = (dados) => setPedidos(dados);
        const handleError = (err) => console.error(err);

        if (user.role === "admin") {
            unsubscribe = triggerPedidosGlobaisAdmin("servylab", handleData, handleError);
        } else {
            unsubscribe = triggerPedidosUsuario("servylab", "94yISgJdpOPL9yavVjH2ojRdIgD2", handleData, handleError);
        }
        console.log(unsubscribe)
        return () => unsubscribe && unsubscribe();
    }, [user]);

    return (
        <PedidosContext.Provider value={{ pedidos }}>
            {children}
        </PedidosContext.Provider>
    );
}