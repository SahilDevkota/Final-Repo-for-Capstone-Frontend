import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestorRegistration } from "../api/ViewerAPI";

export default function Register() {
  const navigate = useNavigate();

  const [inputList, setInputList] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setInputList((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response =
        await InvestorRegistration(inputList);

      const token =
        response?.data?.accessToken ||
        response?.data?.AccessToken;

      if (token) {
        localStorage.setItem(
          "accessToken",
          token
        );
      }

      localStorage.setItem(
        "newUserUsername",
        inputList.username
      );

      setSuccessMessage(
        "Account created successfully. Choose your interests next."
      );

      setTimeout(() => {
        navigate("/interests");
      }, 1000);
    } catch (error) {
      console.error(
        "Registration failed:",
        error
      );

      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data;

      if (typeof backendMessage === "string") {
        setErrorMessage(backendMessage);
      } else if (error?.response?.status === 400) {
        setErrorMessage(
          "Please check your details and try again."
        );
      } else {
        setErrorMessage(
          "Registration failed. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <p className="eyebrow">
          JOIN THE PLATFORM
        </p>

        <h1>Create an account</h1>

        <p>
          Build your personal market workspace
          and watchlist.
        </p>

        <label htmlFor="firstName">
          First Name
        </label>

        <input
          id="firstName"
          type="text"
          name="firstName"
          value={inputList.firstName}
          onChange={handleChange}
          required
        />

        <label htmlFor="lastName">
          Last Name
        </label>

        <input
          id="lastName"
          type="text"
          name="lastName"
          value={inputList.lastName}
          onChange={handleChange}
          required
        />

        <label htmlFor="username">
          Username
        </label>

        <input
          id="username"
          type="text"
          name="username"
          value={inputList.username}
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
          minLength={8}
          maxLength={20}
          value={inputList.password}
          onChange={handleChange}
          required
        />

        <label htmlFor="email">
          Email
        </label>

        <input
          id="email"
          type="email"
          name="email"
          placeholder="abc@gmail.com"
          value={inputList.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="phoneNumber">
          Phone Number
        </label>

        <input
          id="phoneNumber"
          type="text"
          name="phoneNumber"
          value={inputList.phoneNumber}
          onChange={handleChange}
          required
        />

        <label htmlFor="dateOfBirth">
          Date of Birth
        </label>

        <input
          id="dateOfBirth"
          type="date"
          name="dateOfBirth"
          value={inputList.dateOfBirth}
          onChange={handleChange}
          required
        />

        {errorMessage && (
          <p className="error-message">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="success-message">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
        >
          {isLoading
            ? "Creating account..."
            : "Create account"}
        </button>
      </form>
    </main>
  );
}