import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import {
  getMyProfile,
  updateEmail,
  updatePhoneNumber,
  updatePassword,
} from "../api/ViewerAPI";

export default function Profile() {
  const navigate = useNavigate();

  const {
    user,
    updateUser,
    removeToken,
  } = useAuth();

  const displayName =
    user?.Name ||
    user?.name ||
    user?.username ||
    "Investor";

  const [profile, setProfile] = useState({
    username: displayName,
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });

  const [newEmail, setNewEmail] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [profilePicture, setProfilePicture] =
    useState(
      localStorage.getItem("profilePicture") || ""
    );

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const response = await getMyProfile();

      const data = response?.data || response;

      const loadedProfile = {
        username:
          data.username ||
          data.Name ||
          data.name ||
          displayName ||
          "Investor",

        firstName:
          data.firstName ||
          data.FirstName ||
          "",

        lastName:
          data.lastName ||
          data.LastName ||
          "",

        email:
          data.email ||
          data.Email ||
          "",

        phoneNumber:
          data.phoneNumber ||
          data.PhoneNumber ||
          "",
      };

      setProfile(loadedProfile);
      setNewEmail(loadedProfile.email);
      setNewPhoneNumber(
        loadedProfile.phoneNumber
      );

      if (updateUser) {
        updateUser(loadedProfile);
      }
    } catch (error) {
      console.error(
        "Could not load profile:",
        error
      );

      setErrorMessage(
        "Could not load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePictureChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please select an image file."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        "Profile picture must be smaller than 5 MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const imageData = reader.result;

      setProfilePicture(imageData);

      localStorage.setItem(
        "profilePicture",
        imageData
      );

      setMessage("Profile picture updated.");
      setErrorMessage("");
    };

    reader.onerror = () => {
      setErrorMessage(
        "Could not upload profile picture."
      );
    };

    reader.readAsDataURL(file);
  }

  function removePicture() {
    setProfilePicture("");

    localStorage.removeItem("profilePicture");

    setMessage("Profile picture removed.");
    setErrorMessage("");
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();

    if (!newEmail.trim()) {
      setErrorMessage(
        "Email address cannot be empty."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      await updateEmail(newEmail);

      const updatedProfile = {
        ...profile,
        email: newEmail,
      };

      setProfile(updatedProfile);

      if (updateUser) {
        updateUser(updatedProfile);
      }

      setMessage(
        "Email address updated successfully."
      );
    } catch (error) {
      console.error(
        "Email update failed:",
        error
      );

      setErrorMessage(
        error?.response?.data ||
          "Could not update your email address."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoneSubmit(event) {
    event.preventDefault();

    if (!newPhoneNumber.trim()) {
      setErrorMessage(
        "Phone number cannot be empty."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      await updatePhoneNumber(newPhoneNumber);

      const updatedProfile = {
        ...profile,
        phoneNumber: newPhoneNumber,
      };

      setProfile(updatedProfile);

      if (updateUser) {
        updateUser(updatedProfile);
      }

      setMessage(
        "Phone number updated successfully."
      );
    } catch (error) {
      console.error(
        "Phone number update failed:",
        error
      );

      setErrorMessage(
        error?.response?.data ||
          "Could not update your phone number."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!currentPassword) {
      setErrorMessage(
        "Enter your current password."
      );
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(
        "New password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        "The new passwords do not match."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      await updatePassword(
        currentPassword,
        newPassword
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "Password updated successfully."
      );
    } catch (error) {
      console.error(
        "Password update failed:",
        error
      );

      setErrorMessage(
        error?.response?.data ||
          "Could not update your password."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    removeToken();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <main className="profile-page">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Loading profile...</h1>
      </main>
    );
  }

  const avatarLetter = (
    profile.username ||
    displayName ||
    "I"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <main className="profile-page">
      <p className="eyebrow">ACCOUNT</p>

      <h1>Your profile</h1>

      {message && (
        <p className="success-message">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="error-message">
          {errorMessage}
        </p>
      )}

      <section className="profile-card">
        <div className="profile-picture-area">
          {profilePicture ? (
            <img
              className="profile-picture"
              src={profilePicture}
              alt="Profile"
            />
          ) : (
            <div className="large-profile-avatar">
              {avatarLetter}
            </div>
          )}

          <label
            htmlFor="profile-picture"
            className="profile-upload-button"
          >
            {profilePicture
              ? "Change picture"
              : "Add picture"}
          </label>

          <input
            id="profile-picture"
            type="file"
            accept="image/*"
            onChange={handlePictureChange}
            hidden
          />

          {profilePicture && (
            <button
              type="button"
              className="remove-picture-button"
              onClick={removePicture}
            >
              Remove
            </button>
          )}
        </div>

        <div>
          <p className="profile-label">
            Username
          </p>

          <h2>{profile.username}</h2>
        </div>

        <div className="profile-detail">
          <span className="profile-label">
            Email address
          </span>

          <span>
            {profile.email || "No email added"}
          </span>
        </div>

        <div className="profile-detail">
          <span className="profile-label">
            Phone number
          </span>

          <span>
            {profile.phoneNumber ||
              "No phone number added"}
          </span>
        </div>

        <div className="profile-detail">
          <span className="profile-label">
            Account type
          </span>

          <span>Investor</span>
        </div>

        <div className="profile-detail">
          <span className="profile-label">
            Status
          </span>

          <span className="active-status">
            Active
          </span>
        </div>

        <button
          type="button"
          className="profile-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </section>

      <section className="profile-settings-card">
        <div className="profile-section-heading">
          <p className="eyebrow">
            ACCOUNT SETTINGS
          </p>

          <h2>Change email address</h2>
        </div>

        <form
          className="profile-settings-form"
          onSubmit={handleEmailSubmit}
        >
          <label htmlFor="new-email">
            Email address
          </label>

          <input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(event) =>
              setNewEmail(event.target.value)
            }
          />

          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : "Save email address"}
          </button>
        </form>
      </section>

      <section className="profile-settings-card">
        <div className="profile-section-heading">
          <p className="eyebrow">
            CONTACT DETAILS
          </p>

          <h2>Change phone number</h2>
        </div>

        <form
          className="profile-settings-form"
          onSubmit={handlePhoneSubmit}
        >
          <label htmlFor="new-phone">
            Phone number
          </label>

          <input
            id="new-phone"
            type="tel"
            value={newPhoneNumber}
            onChange={(event) =>
              setNewPhoneNumber(event.target.value)
            }
          />

          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : "Save phone number"}
          </button>
        </form>
      </section>

      <section className="profile-settings-card">
        <div className="profile-section-heading">
          <p className="eyebrow">SECURITY</p>

          <h2>Change password</h2>
        </div>

        <form
          className="profile-settings-form"
          onSubmit={handlePasswordSubmit}
        >
          <label htmlFor="current-password">
            Current password
          </label>

          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) =>
              setCurrentPassword(event.target.value)
            }
          />

          <label htmlFor="new-password">
            New password
          </label>

          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(event.target.value)
            }
          />

          <label htmlFor="confirm-password">
            Confirm new password
          </label>

          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
          />

          <button type="submit" disabled={saving}>
            {saving
              ? "Updating..."
              : "Change password"}
          </button>
        </form>
      </section>

      <Link
        className="secondary-link"
        to="/dashboard"
      >
        Back to dashboard
      </Link>
    </main>
  );
}