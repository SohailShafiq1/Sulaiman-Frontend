import React, { useState, useEffect } from 'react';

const DashboardHome = () => {
    const [stats, setStats] = useState({ tournaments: 0, owners: 0, admins: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('adminToken');
            // Conditional Logic: Ensure these API calls only trigger if authenticated.
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admins/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching stats:", error);
                setLoading(false);
            }
        };

        // Call the enclosed async fetching method
        fetchStats();
    }, []); // Only runs when mounted

    return (
        <>
            <h1>Welcome to Admin Dashboard</h1>
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Tournaments</h3>
                    <p>{stats.tournaments}</p>
                </div>
                <div className="stat-card">
                    <h3>Piegon Owners</h3>
                    <p>{stats.owners}</p>
                </div>
                <div className="stat-card">
                    <h3>Active Admins</h3>
                    <p>{stats.admins}</p>
                </div>
            </div>
        </>
    );
};

export default DashboardHome;
