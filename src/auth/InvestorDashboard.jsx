import { Link } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import {useEffect,useState} from "react"
import {getAlert,getAlertStatus,setAlertStatus} from "../api/ViewerAPI"
import UserWatchList from "./UserWatchList";

export default function InvestorDashboard() {
  const { user } = useAuth();

  const [alertMessage,setAlertMessage]  = useState("")
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const displayName =
    user?.Name ||
    user?.name ||
    user?.username ||
    "Investor";

    useEffect(() => {
    async function loadAlert() {
        try {
            const response = await getAlert();
            setAlertMessage(response.data);
        } catch (error) {
            console.error("Could not load alert:", error);
        }
    }

    loadAlert();
}, []);

useEffect(() => {
    async function loadAlertStatus() {
        try {
            const response = await getAlertStatus();
            setAlertsEnabled(response.data);
        } catch (error) {
            console.error(error);
        }
    }

    loadAlertStatus();
}, []);

  return (
    <main className="dashboard-page">
      <section className="dashboard-header">
        <div className="dashboard-welcome">
          <p className="eyebrow">
            YOUR MARKET WORKSPACE
          </p>

          <h1>
            Welcome back,
            <br />
            {displayName}.
          </h1>

          <p className="dashboard-subtitle">
            Track your investor assets, review your
            watchlist, and keep up with the market.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <Link
            className="dashboard-action"
            to="/stocks"
          >
            Explore markets
          </Link>
          
        </div>
      </section>

      <section className="dashboard-content dashboard-single-column">
        <section className="dashboard-section watchlist-dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">YOUR ASSETS</p>
              <h2>Watchlist</h2>
            </div>

            <Link to="/watchlist">
              View all →
            </Link>
          </div>

          <UserWatchList
            limit={3}
            compact={true}
          />
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">MARKET ALERTS</p>
              <h2>Stay informed</h2>
            </div>

        <button
          type="button"
          className="outline-button"
          onClick={async () => {
            try {
            const newStatus = !alertsEnabled;

              await setAlertStatus(newStatus);

              setAlertsEnabled(newStatus);
              } catch (error) {
              console.error(
              "Could not change alert settings:",
              error
                  );
              }
            }}
        >
            {alertsEnabled
            ? "Turn alerts off"
            : "Turn alerts on"}
            </button>
          </div>

          <div className="alert-panel">

          <div className="alert-panel-icon">
            {alertMessage ? "⚠" : "✓"}
          </div>

          <div className="alert-panel-content">

            <h3>
                {alertMessage
                    ? "Market Alert"
                    : "No new alerts"}
            </h3>

            <p>
                {alertMessage ||
                    "Your watchlist sentiment is currently stable."}
            </p>

          </div>

          </div>
        </section>

        <section
          id="latest-news"
          className="dashboard-section"
        >
          
        </section>
      </section>
    </main>
  );
}