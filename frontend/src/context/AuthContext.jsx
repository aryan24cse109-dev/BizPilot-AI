import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeRole, setActiveRole] = useState('business'); // 'business' or 'client'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedRole = localStorage.getItem('bizpilot_active_role');
      if (savedRole) setActiveRole(savedRole);

      try {
        const response = await authApi.getMe();
        if (response?.data?.user) {
          const userData = response.data.user;
          setUser(userData);
          const userRole = (userData.accountCategory || 'BUSINESS').toLowerCase();
          setActiveRole(userRole);
          localStorage.setItem('bizpilot_active_role', userRole);

          if (userData.businessProfile?.businessName) {
            const ws = { id: userData.id, name: userData.businessProfile.businessName };
            setActiveWorkspace(ws);
            localStorage.setItem('bizpilot_active_workspace', ws.id);
          }
        }
      } catch (err) {
        localStorage.removeItem('bizpilot_token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (emailOrUsername, password, roleHint) => {
    const email = (emailOrUsername || 'business@bizpilot.ai').trim();
    const accountCategory = (
      roleHint ||
      (email.toLowerCase().includes('client') || email.toLowerCase().includes('rahul')
        ? 'CLIENT'
        : 'BUSINESS')
    ).toUpperCase();

    const fullName =
      accountCategory === 'BUSINESS'
        ? 'Rajesh Kumar (TechNova)'
        : 'Rahul Sharma (Rahul Enterprises)';

    const res = await authApi.login({
      email,
      accountCategory,
      fullName,
    });

    if (res?.data?.user) {
      const loggedInUser = res.data.user;
      const token = res.data.token;
      if (token) localStorage.setItem('bizpilot_token', token);
      setUser(loggedInUser);

      const userRole = (loggedInUser.accountCategory || accountCategory).toLowerCase();
      setActiveRole(userRole);
      localStorage.setItem('bizpilot_active_role', userRole);

      const ws = {
        id: loggedInUser.id,
        name: loggedInUser.businessProfile?.businessName || `${loggedInUser.fullName}'s Workspace`,
      };
      setActiveWorkspace(ws);
      localStorage.setItem('bizpilot_active_workspace', ws.id);

      return loggedInUser;
    }
    throw new Error(res?.message || 'Login failed');
  };

  const googleSignIn = async (credential, accountCategory = 'BUSINESS') => {
    const res = await authApi.googleLogin(credential, accountCategory);
    if (res?.data?.user) {
      const loggedInUser = res.data.user;
      const token = res.data.token;
      if (token) localStorage.setItem('bizpilot_token', token);
      setUser(loggedInUser);

      const userRole = (loggedInUser.accountCategory || accountCategory).toLowerCase();
      setActiveRole(userRole);
      localStorage.setItem('bizpilot_active_role', userRole);
      return loggedInUser;
    }
    throw new Error(res?.message || 'Google authentication failed');
  };

  const register = async (formData) => {
    const res = await authApi.onboarding(formData);
    if (res?.data?.user) {
      const registeredUser = res.data.user;
      setUser(registeredUser);
      return registeredUser;
    }
    return login(formData.email || formData.businessEmail, 'Password@123', formData.accountCategory);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network failure on logout
    }
    localStorage.removeItem('bizpilot_token');
    localStorage.removeItem('bizpilot_active_workspace');
    setUser(null);
    setActiveWorkspace(null);
  };

  const switchWorkspace = (workspace) => {
    setActiveWorkspace(workspace);
    localStorage.setItem('bizpilot_active_workspace', workspace.id);
  };

  const toggleRole = () => {
    const nextRole = activeRole === 'business' ? 'client' : 'business';
    setActiveRole(nextRole);
    localStorage.setItem('bizpilot_active_role', nextRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeWorkspace,
        activeRole,
        loading,
        login,
        googleSignIn,
        register,
        logout,
        switchWorkspace,
        toggleRole,
        setActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
