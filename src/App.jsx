import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { FaLink } from 'react-icons/fa';
import Navbar from './components/Navbar';
import Banner from './components/Banner';
import StatsBar from './components/StatsBar';
import DateTabs from './components/DateTabs';
import Leaderboard from './components/Leaderboard';
import Contact from './components/Contact';
import Footer from './components/Footer';
const DashboardHome = React.lazy(() => import('./Admin Page/DashboardHome'));
const AdminDashboard = React.lazy(() => import('./Admin Page/AdminDashboard'));
const Tournaments = React.lazy(() => import('./Admin Page/Tournaments'));
const Categories = React.lazy(() => import('./Admin Page/Categories'));
const News = React.lazy(() => import('./Admin Page/News'));
const AdminLogin = React.lazy(() => import('./Admin Page/AdminLogin'));
const ManageAdmins = React.lazy(() => import('./Admin Page/ManageAdmins'));
const ManageOwners = React.lazy(() => import('./Admin Page/ManageOwners'));
const GeneralSettings = React.lazy(() => import('./Admin Page/GeneralSettings'));
import LeagueView from './LeagueView';
import './App.css';

function Home() {
  const [activeTournament, setActiveTournament] = useState(null);
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async (isInitial = false) => {
      try {
        // Fetch News for broadcast
        try {
          const newsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/news`);
          const newsData = await newsRes.json();
          if (!isMounted) return;
          setNewsList(newsData.filter(n => n.status === 'Published'));
        } catch (e) {
          console.error("News fetch error:", e);
        }

        // 1. Fetch lightweight tournament summaries
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments?summary=true`);
        const data = await response.json();
        if (!isMounted) return;

        if (data.length > 0) {
          // Find the most recent active tournament summary
          const activeSummary = data.find(t => t.status === 'Active') || data[0];

          // 2. Fetch ONLY the active tournament's full details (with participants)
          const activeRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments/${activeSummary._id}`);
          const activeFull = await activeRes.json();
          if (!isMounted) return;
          setActiveTournament(activeFull);

          // Only recalculate the active date index on the initial load
          if (isInitial) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const flyingDatesArr = activeFull.flyingDates || [];
            let bestIdx = 'total';

            if (flyingDatesArr.length > 0) {
              const firstDate = new Date(flyingDatesArr[0]);
              firstDate.setHours(0, 0, 0, 0);

              const lastDate = new Date(flyingDatesArr[flyingDatesArr.length - 1]);
              lastDate.setHours(0, 0, 0, 0);

              // Check if today is a flying date
              for (let i = 0; i < flyingDatesArr.length; i++) {
                const d = new Date(flyingDatesArr[i]);
                d.setHours(0, 0, 0, 0);
                if (today.getTime() === d.getTime()) {
                  bestIdx = i;
                  break;
                }
              }
              // If not on a flying date but between first and last, show total (break day)
              // Otherwise if before first or after last, also show total
              // bestIdx already defaults to 'total'
            }
            setActiveDateIndex(bestIdx);
          }
        }
        if (isInitial) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (isInitial) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData(true);

    // Poll every 10 seconds for live updates
    const intervalId = setInterval(() => {
      fetchData(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  if (!activeTournament) return (
    <>
      <Banner posters={[]} />
      <Navbar />
      <div className="main-content">
        <div className="no-tournaments">No active tournaments found. Create one in the Admin panel.</div>
      </div>
    </>
  );

  const flyingDates = activeTournament.flyingDates || [];

  return (
    <>
      <Banner posters={activeTournament.posters} />
      <Navbar />
      <div className="main-content">
        <div className="announcement">
          <marquee behavior="scroll" direction="right">
            {newsList.map(news => (
              <span key={news._id} style={{ marginLeft: '100px' }}>
                {news.title}: {news.content}
              </span>
            ))}
          </marquee>
        </div>

        <StatsBar tournament={activeTournament} dateIndex={activeDateIndex} />
        <DateTabs
          dates={flyingDates}
          activeDateIndex={activeDateIndex}
          onDateChange={setActiveDateIndex}
        />
        <Leaderboard
          tournament={activeTournament}
          dateIndex={activeDateIndex}
        />
      </div>
      <Footer />
    </>
  );
}

function TournamentView() {
  const { id, code } = useParams();
  const tournamentId = id || code; // Support both /tournament/:id and /:code routes
  const [tournament, setTournament] = useState(null);
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async (isInitial = false) => {
      try {
        // Fetch News for broadcast
        try {
          const newsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/news`);
          const newsData = await newsRes.json();
          if (!isMounted) return;
          setNewsList(newsData.filter(n => n.status === 'Published'));
        } catch (e) {
          console.error("News fetch error:", e);
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments/${tournamentId}`);
        const data = await response.json();
        if (!isMounted) return;
        setTournament(data);

        if (isInitial) {
          // Smart date selection: show current day if flying date, total on break days during tournament
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const flyingDatesArr = data.flyingDates || [];
          let bestIdx = 'total';

          if (flyingDatesArr.length > 0) {
            const firstDate = new Date(flyingDatesArr[0]);
            firstDate.setHours(0, 0, 0, 0);

            const lastDate = new Date(flyingDatesArr[flyingDatesArr.length - 1]);
            lastDate.setHours(0, 0, 0, 0);

            // Check if today is a flying date
            for (let i = 0; i < flyingDatesArr.length; i++) {
              const d = new Date(flyingDatesArr[i]);
              d.setHours(0, 0, 0, 0);
              if (today.getTime() === d.getTime()) {
                bestIdx = i;
                break;
              }
            }
            // If not on a flying date but between first and last, show total (break day)
            // Otherwise if before first or after last, also show total
            // bestIdx already defaults to 'total'
          }
          setActiveDateIndex(bestIdx);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching tournament:", error);
        if (isInitial) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData(true);

    // Poll every 10 seconds for live updates
    const intervalId = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [tournamentId]);

  if (!tournament) return <div>Tournament not found</div>;

  const flyingDates = tournament.flyingDates || [];

  return (
    <>
      <Banner posters={tournament.posters} />
      <Navbar />
      <div className="main-content">
        <div className="announcement">
          <marquee behavior="scroll" direction="right">
            {tournament.headline || ` -  کوٹلہ کمیٹی کی جانب سے تمام کھلاڑیوں کو بیسٹ وشز`}

            {newsList.map(news => (
              <span key={news._id} style={{ marginLeft: '100px' }}>
                {news.title}: {news.content}
              </span>
            ))}
          </marquee>
        </div>

        <StatsBar tournament={tournament} dateIndex={activeDateIndex} />
        <DateTabs
          dates={flyingDates}
          activeDateIndex={activeDateIndex}
          onDateChange={setActiveDateIndex}
        />
        <Leaderboard
          tournament={tournament}
          dateIndex={activeDateIndex}
        />
      </div>
      <Footer />
    </>
  );
}


function App() {
  return (
    <Router>
      <div className="app-container">
        <React.Suspense fallback={<div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading App...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/league/:leagueName" element={<LeagueView />} />
            <Route path="/tournament/:id" element={<TournamentView />} />
            <Route path="/contact" element={
              <>
                <Banner />
                <Navbar />
                <div className="main-content">
                  <Contact />
                </div>
                <Footer />
              </>
            } />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={<AdminDashboard />}>
              <Route index element={<DashboardHome />} />
              <Route path="tournaments" element={<Tournaments />} />
              <Route path="categories" element={<Categories />} />
              <Route path="owners" element={<ManageOwners />} />
              <Route path="news" element={<News />} />
              <Route path="users" element={<ManageAdmins />} />
              <Route path="settings" element={<GeneralSettings />} />
            </Route>
            {/* Short code route - must be last to not interfere with other routes */}
            <Route path="/:code" element={<TournamentView />} />
          </Routes>
        </React.Suspense>
      </div>
    </Router>
  );
}

export default App;
