import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../api/ViewerAPI";
import { useAuth } from "../api/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { saveToken } = useAuth();

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setLoginData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await login(loginData);

      console.log("Login response:", response.data);

      if (!response.data?.AccessToken) {
        throw new Error("No access token returned.");
      }

      saveToken(response.data);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);

      const status = error.response?.status;

      if (
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 404
      ) {
        setErrorMessage("Wrong username or password.");
      } else if (!error.response) {
        setErrorMessage(
          "Could not connect to the backend."
        );
      } else {
        setErrorMessage(
          "Login failed. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <p className="eyebrow">WELCOME BACK</p>

        <h1>Login</h1>

        <p>
          Sign in to access your market workspace.
        </p>

        <label htmlFor="username">
          Username
        </label>

        <input
          id="username"
          type="text"
          name="username"
          value={loginData.username}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">
          Password
        </label>

        <input
          id="password"
          type="password"
          name="password"
          value={loginData.password}
          onChange={handleChange}
          required
        />

        {errorMessage && (
          <p className="error-message">
            {errorMessage}
          </p>
        )}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>

        <p>
          Do not have an account?{" "}
          <Link to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}