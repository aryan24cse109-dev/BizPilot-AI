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
      const token = localStorage.getItem('bizpilot_token');
      const savedRole = localStorage.getItem('bizpilot_active_role');
      if (savedRole) setActiveRole(savedRole);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          const userData = response.data;
          setUser(userData);

          const savedWsId = localStorage.getItem('bizpilot_active_workspace');
          const foundWs = userData.workspacesOwned?.find(w => w.id === savedWsId) || 
                          userData.workspaceMembers?.find(m => m.workspace?.id === savedWsId)?.workspace || 
                          userData.activeWorkspace;

          if (foundWs) {
            setActiveWorkspace(foundWs);
            localStorage.setItem('bizpilot_active_workspace', foundWs.id);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        localStorage.removeItem('bizpilot_token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (emailOrUsername, password) => {
    const res = await authApi.login({ emailOrUsername, password });
    if (res.success && res.data) {
      const { user: loggedInUser, token } = res.data;
      localStorage.setItem('bizpilot_token', token);
      setUser(loggedInUser);

      if (loggedInUser.activeWorkspace) {
        setActiveWorkspace(loggedInUser.activeWorkspace);
        localStorage.setItem('bizpilot_active_workspace', loggedInUser.activeWorkspace.id);
      }
      return loggedInUser;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    if (res.success && res.data) {
      const { user: registeredUser, token } = res.data;
      localStorage.setItem('bizpilot_token', token);
      setUser(registeredUser);

      if (registeredUser.activeWorkspace) {
        setActiveWorkspace(registeredUser.activeWorkspace);
        localStorage.setItem('bizpilot_active_workspace', registeredUser.activeWorkspace.id);
      }
      return registeredUser;
    }
    throw new Error(res.message || 'Registration failed');
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
