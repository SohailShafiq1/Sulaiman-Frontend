import React, { useState, useEffect } from 'react';
import { FaList, FaTrophy, FaUsers, FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Tournaments.css'; // Reusing established admin styles

const Categories = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments?summary=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setTournaments(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tournaments for categories:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchTournaments();
    };
    init();
  }, []);

  return (
    <div className="tournaments-page">
      <div className="page-header">
        <div className="header-content">
          <h1><FaList /> Tournament Categories</h1>
          <p>Comprehensive list of tournaments, status and enrollment summary</p>
        </div>
      </div>

      <div className="tournament-list-container">
        <div className="owners-table-container">
          <table className="owners-table">
            <thead>
              <tr>
                <th>Tournament Name</th>
                <th>Status</th>
                <th>Enrolled Persons</th>
                <th>Pigeons / Helpers</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t._id}>
                  <td className="owner-row-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FaTrophy style={{ color: '#c9a44c' }} />
                      {t.name}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${t.status?.toLowerCase() || 'upcoming'}`}>
                      {t.status || 'Upcoming'}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaUsers style={{ color: '#4a5568' }} />
                      {t.participantCount || 0} Participants
                    </div>
                  </td>
                  <td>
                    {t.numPigeons || 0} Pigeons / {t.helperPigeons || 0} Helpers
                  </td>
                  <td>
                    <button
                      className="edit-link"
                      onClick={() => navigate('/admin/tournaments')}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      Manage <FaArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tournaments.length === 0 && (
            <div className="no-results">No tournaments found. Create one in Tournament section.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
