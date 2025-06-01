import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/check-auth', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.authenticated) {
                setIsLoggedIn(true);
                setUser(data.user);
            } else {
                setIsLoggedIn(false);
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setIsLoggedIn(false);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = (userData) => {
        setIsLoggedIn(true);
        setUser(userData);
    };

    const logout = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/logout', {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                setIsLoggedIn(false);
                setUser(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Logout failed:', error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ 
            isLoggedIn, 
            user, 
            login, 
            logout,
            isLoading 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);