"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    getAuth
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

interface AuthContextType {
    user: User | null;
    loading: boolean;
    userRole: "admin" | "funcionario" | null;
    empresa: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<"admin" | "funcionario" | null>(null);
    const [empresa, setEmpresa] = useState<string | null>(null);
    async function fetchEmpresa(uid: string): Promise<string | null> {
        try {
            const snapshot = await get(ref(db, `usuarios/logins/${uid}/empresa`));
            const empresa = snapshot.val();
            console.log(empresa);
            return empresa;
        } catch (error) {
            console.error("Erro ao buscar empresa do usuário:", error);
            return null;
        }
    }
    async function fetchUserRole(uid: string): Promise<"admin" | "funcionario"> {
        try {
            const snapshot = await get(ref(db, `usuarios/logins/${uid}/role`));
            const role = snapshot.val();
            
            if (role === "admin" || role === "funcionario") {
                return role;
            }
            
            console.warn(`Role inválido para o usuário ${uid}: ${role}`);
            return "funcionario";
        } catch (error) {
            console.error("Erro ao buscar role do usuário:", error);
            return "funcionario"; // default para funcionário em caso de erro
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            if (currentUser) {
                // busca o role no Firebase Database
                const role = await fetchUserRole(currentUser.uid);
                setUserRole(role);
                const empresa = await fetchEmpresa(currentUser.uid);
                setEmpresa(empresa);
                console.log(`Usuário autenticado: ${currentUser.email}, Role: ${role}, Empresa: ${empresa}`);
            } else {
                setUserRole(null);
            }
            
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        user,
        loading,
        userRole,
        login,
        logout,
        empresa,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}