import { createContext, FC, PropsWithChildren, useContext } from "react"

type AuthContextType = { isAuthenticated: boolean }

const AuthContext = createContext<AuthContextType>({ isAuthenticated: true })

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => (
  <AuthContext.Provider value={{ isAuthenticated: true }}>{children}</AuthContext.Provider>
)

export const useAuth = () => useContext(AuthContext)
