import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [AccessToken, setAccessToken] = useState("");
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedToken =
      localStorage.getItem("accessToken");

    if (!savedToken) {
      setIsReady(true);
      return;
    }

    try {
      const decodedUser = jwtDecode(savedToken);

      setAccessToken(savedToken);
      setUser(decodedUser);
    } catch (error) {
      console.error(
        "Invalid saved access token:",
        error
      );

      localStorage.removeItem("accessToken");
      setAccessToken("");
      setUser(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  const saveToken = (data) => {
    const token = data?.AccessToken;

    if (!token) {
      console.error(
        "No AccessToken was returned by the backend."
      );
      return;
    }

    try {
      const decodedUser = jwtDecode(token);

      localStorage.setItem("accessToken", token);

      setAccessToken(token);
      setUser(decodedUser);
    } catch (error) {
      console.error(
        "Could not decode access token:",
        error
      );
    }
  };

  const updateUser = (updatedUserData) => {
    setUser((previousUser) => ({
      ...(previousUser || {}),
      ...updatedUserData,
    }));
  };

  const removeToken = () => {
    localStorage.removeItem("accessToken");

    setAccessToken("");
    setUser(null);
  };

  const isAuthenticated =
    Boolean(AccessToken) && Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        AccessToken,
        user,
        isReady,
        isAuthenticated,
        saveToken,
        updateUser,
        removeToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}