import {
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Navbar from "./auth/Navbar";
import Home from "./auth/Home";
import InvestorDashboard from "./auth/InvestorDashboard";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Profile from "./auth/Profile";

import Stocks from "./auth/Stocks";
import UserWatchList from "./auth/UserWatchList";
import StockDetail from "./auth/StockDetail";
import PricePrediction from "./auth/PricePrediction";
import InterestSelection from "./auth/InterestSelection";

import PortfolioPage from "./features/portfolio/PortfolioPage";
import ComparePage from "./features/compare/ComparePage";
import PricePage from "./features/price/PricePage";
import ChatPanel from "./features/assistant/ChatPanel";
import TutorialPopup from "./features/tutorial/TutorialPopup";

function AppLayout() {
  const location = useLocation();

  const pagesWithoutNavbar = [
    "/",
    "/home",
    "/login",
    "/register",
    "/interests",
  ];

  const hideNavbar = pagesWithoutNavbar.includes(
    location.pathname
  );

  return (
    <>
      {!hideNavbar && <Navbar />}

      {!hideNavbar && <ChatPanel />}

      {!hideNavbar && <TutorialPopup />}

      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/home"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/interests"
          element={<InterestSelection />}
        />

        <Route
          path="/dashboard"
          element={<InvestorDashboard />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        

        <Route
          path="/stocks"
          element={<Stocks />}
        />

        <Route
          path="/watchlist"
          element={<UserWatchList />}
        />
        <Route
           path="/price-prediction/:symbol"
          element={<PricePrediction />}
          />

        <Route
          path="/stock/:symbol"
          element={<StockDetail />}
        />

        <Route
          path="/portfolio"
          element={<PortfolioPage />}
        />

        <Route
          path="/compare"
          element={<ComparePage />}
        />

        <Route
          path="/price/:symbol"
          element={<PricePage />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return <AppLayout />;
}