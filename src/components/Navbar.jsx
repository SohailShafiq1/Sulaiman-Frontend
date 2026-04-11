import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const [leagues, setLeagues] = useState([]);
  const [hasIndependent, setHasIndependent] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all leagues
        const leagueRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/leagues`);
        const allLeagues = await leagueRes.json();
        setLeagues(allLeagues.map(l => l.name));

        // Fetch tournaments to see if we have independent ones
        const tourneyRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments`);
        const allTournaments = await tourneyRes.json();
        
        const activeTournaments = allTournaments.filter(t => t.status === 'Active' && t.showOnHome !== false);
        const independentFound = activeTournaments.some(t => 
          !t.leagueName || t.leagueName === 'Independent' || t.leagueName === 'General'
        );
        
        setHasIndependent(independentFound);
      } catch (error) {
        console.error("Error fetching navbar data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-container">
        
        <ul className="nav-links">
          {leagues.map((league) => (
            <li key={league}>
              <Link to={`/league/${encodeURIComponent(league)}`}>{league}</Link>
            </li>
          ))}
          
          {hasIndependent && (
            <li>
              <Link to="/league/Independent">Others</Link>
            </li>
          )}

          {!leagues.length && !hasIndependent && (
            <li><span className="no-tournaments-nav">No Active Clubs</span></li>
          )}
          
          <li>
            <Link to="/contact" className="contact-nav-button">Contact</Link>
          </li>
        </ul>
        
      </div>
    </nav>
  );
};

export default Navbar;
