import React, { useState, useEffect } from 'react';
import './Tournaments.css'; // Reusing the high-quality admin styles
import { FaPlus, FaTrash, FaEdit, FaNewspaper } from 'react-icons/fa';

const News = () => {
    const [news, setNews] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '', status: 'Published' });

    const fetchNews = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/news`);
            const data = await response.json();
            setNews(data);
        } catch (error) {
            console.error('Error fetching news:', error);
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchNews();
        };
        init();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingNews
            ? `${import.meta.env.VITE_API_BASE_URL}/news/${editingNews._id}`
            : `${import.meta.env.VITE_API_BASE_URL}/news`;

        const method = editingNews ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                fetchNews();
                setIsModalOpen(false);
                setEditingNews(null);
                setFormData({ title: '', content: '', status: 'Published' });
            }
        } catch (error) {
            console.error('Error saving news:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this news item?')) return;

        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/news/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            fetchNews();
        } catch (error) {
            console.error('Error deleting news:', error);
        }
    };

    const openEditModal = (item) => {
        setEditingNews(item);
        setFormData({ title: item.title, content: item.content, status: item.status });
        setIsModalOpen(true);
    };

    return (
        <div className="admin-tournaments-container">
            <div className="admin-tournaments-header">
                <div className="header-title-section">
                    <FaNewspaper className="header-icon" />
                    <div>
                        <h1>Announcements & News</h1>
                        <p>Manage public news and updates</p>
                    </div>
                </div>
                <button className="add-tournament-btn" onClick={() => {
                    setEditingNews(null);
                    setFormData({ title: '', content: '', status: 'Published' });
                    setIsModalOpen(true);
                }}>
                    <FaPlus /> Post News
                </button>
            </div>

            <div className="table-responsive-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Post Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {news.map((item) => (
                            <tr key={item._id}>
                                <td className="owner-row-name">{item.title}</td>
                                <td>
                                    <span className={`status-badge ${item.status === 'Published' ? 'status-active' : 'status-pending'}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td>{new Date(item.date).toLocaleDateString()}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="edit-btn" onClick={() => openEditModal(item)}>
                                            <FaEdit />
                                        </button>
                                        <button className="delete-btn" onClick={() => handleDelete(item._id)}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {news.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                                    No news items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content tournament-modal">
                        <h2>{editingNews ? 'Edit News' : 'Post New News'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="News Title"
                                />
                            </div>
                            <div className="form-group">
                                <label>Content</label>
                                <textarea
                                    required
                                    rows="5"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Write news content here..."
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="Published">Published</option>
                                    <option value="Draft">Draft</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="save-btn">Save Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default News;
