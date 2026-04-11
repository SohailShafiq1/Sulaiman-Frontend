import React, { useState, useEffect, useCallback } from 'react';
import { FaSave, FaTrash, FaImage, FaPlus } from 'react-icons/fa';
import './Tournaments.css'; // Reusing established admin styles
import './GeneralSettings.css';

const GeneralSettings = () => {
    const [defaultPosters, setDefaultPosters] = useState([]);
    const [newPosterFiles, setNewPosterFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchSettings = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings/defaultPosters`);
            if (response.ok) {
                const data = await response.json();
                setDefaultPosters(data.value || []);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchSettings();
        };
        init();
    }, [fetchSettings]);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        setNewPosterFiles(prev => [...prev, ...files]);

        const readers = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readers).then(results => {
            setDefaultPosters(prev => [...prev, ...results]);
        });
    };

    const removePoster = (index) => {
        const updated = [...defaultPosters];
        updated.splice(index, 1);
        setDefaultPosters(updated);

        // Also remove from new files if it was newly added
        // This is tricky if we don't track which is which
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;

            // Create FormData for multipart upload
            const formData = new FormData();
            formData.append('key', 'defaultPosters');

            // Keep existing poster URLs that are not base64
            const existingPosters = defaultPosters.filter(p => !p.startsWith('data:'));
            formData.append('value', JSON.stringify(existingPosters));

            // Append new files
            newPosterFiles.forEach(file => {
                formData.append('posters', file);
            });

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // No Content-Type header for FormData
                },
                body: formData
            });

            if (response.ok) {
                setMessage('Settings items saved successfully!');
                setNewPosterFiles([]);
                await fetchSettings(); // Refresh to get proper URLs
                setTimeout(() => setMessage(''), 3000);
            } else {
                const error = await response.json();
                setMessage(error.message || 'Failed to save settings.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage('Server error.');
        }
        setLoading(false);
    };

    return (
        <div className="tournaments-page">
            <div className="settings-page-header">
                <h2><FaImage /> Default Banner Posters</h2>
                <p>These posters will be shown on the home page if no tournament is active, or if an active tournament has no posters.</p>
            </div>

            {message && <div className={`message-banner ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}

            <div className="tournament-edit-view">
                <div className="form-section">
                    <h3>Manage Default Posters</h3>
                    <div className="image-grid">
                        {defaultPosters.map((img, idx) => (
                            <div key={idx} className="poster-preview">
                                <img src={img} alt={`Default Banner ${idx + 1}`} />
                                <button type="button" className="remove-btn" onClick={() => removePoster(idx)}>
                                    <FaTrash />
                                </button>
                            </div>
                        ))}
                        <label className="add-poster-card">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                            <FaPlus />
                            <span>Add Photo</span>
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button className="save-btn" onClick={handleSave} disabled={loading}>
                        <FaSave /> {loading ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
