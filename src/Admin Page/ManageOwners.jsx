import React, { useState, useEffect } from 'react';
import { FaPlus, FaUser, FaSave, FaTrash, FaEdit, FaSearch, FaImage, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import Modal from '../components/Modal';
import '../styles/Modal.css';
import './Tournaments.css'; // Reusing some styles

const ManageOwners = () => {
  const [owners, setOwners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'add', 'edit'
  const [selectedOwner, setSelectedOwner] = useState(null);

  const initialFormState = { name: '', image: '', address: '', phone: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [imageFile, setImageFile] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', onConfirm: null, confirmText: 'OK' });

  const fetchOwners = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/owners`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setOwners(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching owners:", error);
      setLoading(false);
    }
  };

  const updateTournamentParticipants = async (ownerId, newName, newImage, newPhone, newAddress) => {
    try {
      const token = localStorage.getItem('adminToken');
      // Fetch all tournaments
      const tournamentsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tournaments = await tournamentsRes.json();

      // Find and update tournaments that have this owner as a participant
      for (const tournament of tournaments) {
        if (!tournament.participants) continue;

        let updated = false;
        const updatedParticipants = tournament.participants.map(p => {
          if (p.ownerId === ownerId || p.ownerId?._id === ownerId) {
            updated = true;
            return {
              ...p,
              name: newName,
              image: newImage || p.image || '',
              phone: newPhone || p.phone || '',
              address: newAddress || p.address || ''
            };
          }
          return p;
        });

        // Update tournament if any participants were changed
        if (updated) {
          await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments/${tournament._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ...tournament, participants: updatedParticipants })
          });
        }
      }
    } catch (error) {
      console.error("Error updating tournament participants:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchOwners();
    };
    init();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    // Check for duplicates
    const isDuplicate = owners.some(owner => {
      if (selectedOwner && owner._id === selectedOwner._id) return false;
      return owner.name.toLowerCase().replace(/\s+/g, '') === formData.name.toLowerCase().replace(/\s+/g, '');
    });

    if (isDuplicate) {
      setModalContent({
        title: "Duplicate Record",
        message: "یہ شخص پہلے ہی شامل ہے۔",
        onConfirm: null
      });
      setModalOpen(true);
      return;
    }

    const token = localStorage.getItem('adminToken');
    const method = selectedOwner ? 'PUT' : 'POST';
    const url = selectedOwner
      ? `${import.meta.env.VITE_API_BASE_URL}/owners/${selectedOwner._id}`
      : `${import.meta.env.VITE_API_BASE_URL}/owners`;

    const submitData = new FormData();
    submitData.append('name', formData.name);
    if (formData.phone) submitData.append('phone', formData.phone);
    if (formData.address) submitData.append('address', formData.address);
    if (imageFile) {
      submitData.append('image', imageFile);
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (response.ok) {
        const savedOwner = await response.json();
        // If editing, update participant names in all tournaments
        if (selectedOwner) {
          await updateTournamentParticipants(selectedOwner._id, savedOwner.name, savedOwner.image, savedOwner.phone, savedOwner.address);
        }
        fetchOwners();
        setView('list');
        setFormData(initialFormState);
        setImageFile(null);
        setSelectedOwner(null);
        setModalContent({ title: 'Success', message: 'Owner saved successfully!', onConfirm: null });
        setModalOpen(true);
      } else {
        const error = await response.json();
        setModalContent({ title: 'Error', message: error.message || 'Failed to save owner', onConfirm: null });
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Error saving owner:", error);
    }
  };

  const handleDelete = (id) => {
    setModalContent({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this owner?',
      confirmText: 'Delete',
      onConfirm: () => performDelete(id)
    });
    setModalOpen(true);
  };

  const performDelete = async (id) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/owners/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchOwners();
      }
    } catch (error) {
      console.error("Error deleting owner:", error);
    }
  };

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-screen">Loading Owners...</div>;

  return (
    <div className="tournaments-page">
      <div className="page-header">
        <div className="header-content">
          <h1><FaUser /> Pigeon Owners</h1>
          <p>Manage global pigeon owners for all tournaments</p>
        </div>
        {view === 'list' && (
          <button className="create-btn" onClick={() => { setView('add'); setFormData(initialFormState); setImageFile(null); setSelectedOwner(null); }}>
            <FaPlus /> Add New Owner
          </button>
        )}
      </div>

      {view === 'list' ? (
        <div className="tournament-list-container">
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by owner name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="owners-table-container">
            <table className="owners-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOwners.map(owner => (
                  <tr key={owner._id}>
                    <td>
                      <div className="owner-row-img">
                        {owner.image ? (
                          <img src={owner.image} alt={owner.name} />
                        ) : (
                          <div className="placeholder-circle">
                            <FaUser />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="owner-row-name">{owner.name}</td>
                    <td>{owner.phone || '-'}</td>
                    <td>{owner.address || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="action-btn edit" onClick={() => {
                          setSelectedOwner(owner);
                          setFormData(owner);
                          setImageFile(null);
                          setView('edit');
                        }}>
                          <FaEdit />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(owner._id)}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOwners.length === 0 && (
              <div className="no-results">No owners found matching your search.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="tournament-form-container">
          <button className="back-btn" onClick={() => setView('list')}>Back to List</button>
          <form className="tournament-form" onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group">
                <label>Owner Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label>Profile Image</label>
                <div className="image-upload-box" onClick={() => document.getElementById('owner-img').click()}>
                  {formData.image ? (
                    <img src={formData.image} alt="preview" className="preview-img" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                  ) : (
                    <div className="upload-placeholder">
                      <FaImage size={30} />
                      <span>Click to upload profile image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    id="owner-img"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn">
                <FaSave /> {selectedOwner ? 'Update Owner' : 'Create Owner'}
              </button>
            </div>
          </form>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalContent.title}
        message={modalContent.message}
        confirmText={modalContent.confirmText}
        onConfirm={modalContent.onConfirm}
      />
    </div>
  );
};

export default ManageOwners;
