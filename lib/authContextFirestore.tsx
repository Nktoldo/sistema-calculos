// "use client";
// import { createContext, useContext, useEffect, useState, ReactNode } from "react";
// import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from "firebase/auth";
// import { auth, getUsuarioData } from "@/lib/firestoreFunctions";

// interface UserData {
//     role: "admin" | "funcionario";
//     empresa: string;
// }

// interface AuthContextType {
//     user: User | null;
//     loading: boolean;
//     userRole: string | null;
//     empresa: string | null;
//     login: (email: string, password: string) => Promise<void>;
//     logout: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//     const [user, setUser] = useState<User | null>(null);
//     const [userRole, setUserRole] = useState<string | null>(null);
//     const [empresa, setEmpresa] = useState<string | null>(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
//             setLoading(true);
//             setUser(currentUser);

//             if (currentUser) {
//                 const data = await getUsuarioData(currentUser.uid) as UserData | null;
                
//                 if (data) {
//                     setUserRole(data.role || "funcionario");
//                     setEmpresa(data.empresa || null);
//                 }
//             } else {
//                 setUserRole(null);
//                 setEmpresa(null);
//             }
            
//             setLoading(false);
//         });

//         return () => unsubscribe();
//     }, []);

//     const login = async (email: string, password: string) => {
//         await signInWithEmailAndPassword(auth, email, password);
//     };

//     const logout = async () => {
//         await signOut(auth);
//     };

//     return (
//         <AuthContext.Provider value={{ user, loading, userRole, empresa, login, logout }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

// export const useAuth = () => {
//     const context = useContext(AuthContext);
//     if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
//     return context;
// };