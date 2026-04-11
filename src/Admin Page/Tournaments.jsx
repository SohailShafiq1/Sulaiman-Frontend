import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTrophy, FaUserShield, FaArrowLeft, FaSave, FaTrash, FaImage, FaCalendarAlt, FaClock, FaDove, FaUserPlus, FaUserFriends, FaEdit, FaUsers, FaMapMarkerAlt, FaPhone, FaLink } from 'react-icons/fa';
import Modal from '../components/Modal';
import '../styles/Modal.css';
import './Tournaments.css';
import { calculateTotalTime, calculateGrandTotal, calculateWinners } from '../utils/calculations';

// Helper function to deeply clean participant data for MongoDB
const cleanParticipantForSave = (participant, numDays = 1, defaultStartTime = '06:00') => {
  // First, use JSON to strip any Mongoose proxies or weird references
  const plain = JSON.parse(JSON.stringify(participant));

  const cleaned = {
    ownerId: plain.ownerId,
    name: plain.name,
    image: plain.image || '',
    address: plain.address || '',
    phone: plain.phone || '',
    pigeonTimes: [],
    totalTime: plain.totalTime || '00:00:00'
  };

  // Rebuild pigeonTimes as a clean array
  if (plain.pigeonTimes) {
    if (Array.isArray(plain.pigeonTimes)) {
      cleaned.pigeonTimes = plain.pigeonTimes.map(t => String(t || ''));
    } else if (typeof plain.pigeonTimes === 'object') {
      // Handle object with numeric keys
      const keys = Object.keys(plain.pigeonTimes).map(Number).sort((a, b) => a - b);
      keys.forEach(key => {
        cleaned.pigeonTimes[key] = String(plain.pigeonTimes[key] || '');
      });
    }
  }

  // Rebuild dailyStartTimes as a clean string array
  if (plain.dailyStartTimes) {
    const dailyArray = [];

    if (Array.isArray(plain.dailyStartTimes)) {
      // Process each element
      for (let i = 0; i < plain.dailyStartTimes.length; i++) {
        const item = plain.dailyStartTimes[i];

        // If it's already a string, use it
        if (typeof item === 'string' && item) {
          dailyArray.push(item);
        }
        // If it's an object (like {'1': '06:00'}), extract the first value
        else if (typeof item === 'object' && item !== null) {
          const values = Object.values(item).filter(v => typeof v === 'string' && v);
          if (values.length > 0) {
            dailyArray.push(values[0]);
          } else {
            dailyArray.push(defaultStartTime);
          }
        }
        // Otherwise use default
        else {
          dailyArray.push(defaultStartTime);
        }
      }
    } else if (typeof plain.dailyStartTimes === 'object') {
      // It's an object, extract values by numeric keys
      for (let i = 0; i < numDays; i++) {
        if (plain.dailyStartTimes[i]) {
          dailyArray.push(String(plain.dailyStartTimes[i]));
        } else {
          dailyArray.push(defaultStartTime);
        }
      }
    }

    // Only add if we have valid times
    if (dailyArray.length > 0) {
      cleaned.dailyStartTimes = dailyArray;
    }
  }

  // Add startTime if present
  if (plain.startTime && typeof plain.startTime === 'string') {
    cleaned.startTime = plain.startTime;
  }

  return cleaned;
};

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'edit'
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState([]);
  const [showLeagueModal, setShowLeagueModal] = useState(false);
  const [leagueFormData, setLeagueFormData] = useState({ name: '', description: '', admin: '' });
  const [editingLeague, setEditingLeague] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', onConfirm: null, confirmText: 'OK' });

  const currentUser = JSON.parse(localStorage.getItem('adminUser'));

  const initialFormState = {
    name: '',
    leagueName: 'Independent',
    admin: currentUser?.id || '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '06:00',
    numDays: 1,
    numPigeons: 0,
    noteTimePigeons: 0,
    helperPigeons: 0,
    status: 'Active',
    showOnHome: true,
    posters: [],
    headline: '',
    participants: [],
    firstWinner: '',
    firstTime: '',
    lastWinner: '',
    lastTime: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [posterFiles, setPosterFiles] = useState([]); // Real file objects for upload
  const [newParticipant, setNewParticipant] = useState({ name: '', image: '', address: '', phone: '' });
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [activeDateIndex, setActiveDateIndex] = useState(null); // Changed to null: Force date selection

  const fetchLeagues = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/leagues`);
      const data = await response.json();
      setLeagues(data);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments?summary=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      // Sort tournaments: User's assigned tournaments first (or their league's tournaments)
      const sortedTournaments = [...data].sort((a, b) => {
        const isAAdmin = (a.admin?._id || a.admin) === currentUser?.id;
        const isBAdmin = (b.admin?._id || b.admin) === currentUser?.id;

        const leagueA = leagues.find(l => l.name === a.leagueName);
        const leagueB = leagues.find(l => l.name === b.leagueName);

        const isALeagueAdmin = (leagueA?.admin?._id || leagueA?.admin) === currentUser?.id;
        const isBLeagueAdmin = (leagueB?.admin?._id || leagueB?.admin) === currentUser?.id;

        const isAOwner = isAAdmin || isALeagueAdmin;
        const isBOwner = isBAdmin || isBLeagueAdmin;

        if (isAOwner && !isBOwner) return -1;
        if (!isAOwner && isBOwner) return 1;
        return 0;
      });

      setTournaments(sortedTournaments);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      setLoading(false);
    }
  }, [currentUser?.id, leagues]);

  const fetchAdmins = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        // Handle unauthorized
        return;
      }
      if (response.status === 404) {
        setAdmins([{ id: 1, name: "Super Admin" }, { id: 2, name: "Admin 1" }]);
        return;
      }
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  }, []);

  // Global Owners Search State
  const [ownerSearch, setOwnerSearch] = useState('');
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false);
  const [globalOwnersList, setGlobalOwnersList] = useState([]);

  const searchGlobalOwners = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/owners/search?q=${ownerSearch}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setGlobalOwnersList(data);
      setShowOwnerSuggestions(data.length > 0);
    } catch (error) {
      console.error("Error searching owners:", error);
    }
  }, [ownerSearch]);

  useEffect(() => {
    const runSearch = async () => {
      if (ownerSearch.length > 1) {
        await searchGlobalOwners();
      } else {
        setGlobalOwnersList([]);
        setShowOwnerSuggestions(false);
      }
    };
    runSearch();
  }, [ownerSearch, searchGlobalOwners]);

  const handleSelectOwner = (owner) => {
    setNewParticipant({
      ownerId: owner._id,
      name: owner.name,
      image: owner.image || '',
      address: owner.address || '',
      phone: owner.phone || ''
    });
    setOwnerSearch(owner.name);
    setShowOwnerSuggestions(false);
  };

  const handleCopyLink = (shortCode, tournamentId, e) => {
    e.stopPropagation();
    // Use shortCode if available, otherwise fallback to _id
    const identifier = shortCode || tournamentId;
    const url = `${window.location.origin}/${identifier}`;
    navigator.clipboard.writeText(url).then(() => {
      const target = e.currentTarget;
      const originalContent = target.innerHTML;
      target.innerHTML = 'Copied!';
      target.classList.add('copied');
      setTimeout(() => {
        target.innerHTML = originalContent;
        target.classList.remove('copied');
      }, 2000);
    });
    // Open the tournament page in a new tab
    window.open(url, '_blank');
  };

  const formatPlayerName = (name) => {
    if (!name) return "";
    const words = name.split(/\s+/);
    if (words.length <= 3) return name;

    // Split long names into two lines to save horizontal space
    const firstPart = words.slice(0, 3).join(' ');
    const secondPart = words.slice(3).join(' ');
    return (
      <>
        {firstPart}
        <br />
        <span style={{ fontSize: '0.85em', opacity: 0.9 }}>{secondPart}</span>
      </>
    );
  };

  const handleGlobalStartTimeChange = (newTime) => {
    const oldTime = formData.startTime;

    const scoringPigeons = formData.noteTimePigeons || formData.numPigeons || 0;
    const helperPigeons = formData.helperPigeons || 0;
    const totalPigeonsPerDay = formData.numPigeons || 0;
    const numDays = formData.numDays || 1;

    const updatedParticipants = (formData.participants || []).map((p) => {
      // Work on a shallow copy so we don't mutate original
      const updated = { ...p };

      // If participant didn't have a custom start time, or it matched the old global time,
      // keep it in sync with the new global start time.
      if (!updated.startTime || updated.startTime === oldTime) {
        updated.startTime = newTime;
      }

      // For dailyStartTimes, only update entries that were using the old global/participant time
      if (Array.isArray(updated.dailyStartTimes)) {
        updated.dailyStartTimes = updated.dailyStartTimes.map((t) => {
          if (
            !t || // empty
            t === oldTime || // exactly old global
            t === p.startTime // matched participant's previous start time
          ) {
            return newTime;
          }
          return t;
        });
      }

      // Recalculate total time for this participant using the new global start time
      updated.totalTime = calculateGrandTotal(
        updated.pigeonTimes,
        totalPigeonsPerDay,
        newTime,
        numDays,
        scoringPigeons,
        helperPigeons,
        updated
      );

      return updated;
    });

    // Recalculate overall winners with the new global start time
    const { firstWinner, firstTime, lastWinner, lastTime } = calculateWinners(
      updatedParticipants,
      newTime
    );

    setFormData({
      ...formData,
      startTime: newTime,
      participants: updatedParticipants,
      firstWinner,
      firstTime,
      lastWinner,
      lastTime
    });
  };

  const handleTimeChange = (participantIndex, pigeonIndex, value) => {
    // Get a clean copy via JSON to remove any Mongoose proxies
    const plainParticipants = JSON.parse(JSON.stringify(formData.participants));
    const updatedParticipant = plainParticipants[participantIndex];

    // Set the new time
    if (!updatedParticipant.pigeonTimes) {
      updatedParticipant.pigeonTimes = [];
    }
    updatedParticipant.pigeonTimes[pigeonIndex] = value;

    const scoringPigeons = formData.noteTimePigeons || formData.numPigeons || 0;
    const helperPigeons = formData.helperPigeons || 0;

    // Recalculate grand total time
    updatedParticipant.totalTime = calculateGrandTotal(
      updatedParticipant.pigeonTimes,
      formData.numPigeons || 0,
      formData.startTime,
      formData.numDays || 1,
      scoringPigeons,
      helperPigeons,
      updatedParticipant
    );

    // Recalculate First and Last Winners
    const { firstWinner, firstTime, lastWinner, lastTime } = calculateWinners(plainParticipants, formData.startTime);

    setFormData({
      ...formData,
      participants: plainParticipants,
      firstWinner,
      firstTime,
      lastWinner,
      lastTime
    });
  };

  const handleParticipantStartTimeChange = (participantIndex, activeDateIndex, value) => {
    // Get a completely clean copy via JSON to remove any Mongoose proxies
    const plainParticipants = JSON.parse(JSON.stringify(formData.participants));
    const currentParticipant = plainParticipants[participantIndex];

    const totalDays = formData.numDays || 1;
    const defaultStartTime = currentParticipant.startTime || formData.startTime || '06:00';

    // Build a new plain array for dailyStartTimes
    const newDailyStartTimes = [];

    // First, populate with existing values or defaults
    for (let i = 0; i < totalDays; i++) {
      if (i === activeDateIndex) {
        // This is the one we're updating
        newDailyStartTimes[i] = value;
      } else {
        // Try to get existing value
        let existingValue = defaultStartTime;

        if (currentParticipant.dailyStartTimes) {
          if (Array.isArray(currentParticipant.dailyStartTimes) && currentParticipant.dailyStartTimes[i]) {
            const item = currentParticipant.dailyStartTimes[i];
            if (typeof item === 'string') {
              existingValue = item;
            } else if (typeof item === 'object' && item !== null) {
              // Extract value from object
              const values = Object.values(item).filter(v => typeof v === 'string');
              if (values.length > 0) existingValue = values[0];
            }
          } else if (currentParticipant.dailyStartTimes[i]) {
            existingValue = String(currentParticipant.dailyStartTimes[i]);
          }
        }

        newDailyStartTimes[i] = existingValue;
      }
    }

    // Update the participant with the new clean array
    currentParticipant.dailyStartTimes = newDailyStartTimes;

    const scoringPigeons = formData.noteTimePigeons || formData.numPigeons || 0;
    const helperPigeons = formData.helperPigeons || 0;

    // Recalculate total time
    currentParticipant.totalTime = calculateGrandTotal(
      currentParticipant.pigeonTimes,
      formData.numPigeons || 0,
      formData.startTime,
      formData.numDays || 1,
      scoringPigeons,
      helperPigeons,
      currentParticipant
    );

    // Recalculate global winners
    const { firstWinner, firstTime, lastWinner, lastTime } = calculateWinners(plainParticipants, formData.startTime);

    setFormData({
      ...formData,
      participants: plainParticipants,
      firstWinner,
      firstTime,
      lastWinner,
      lastTime
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewParticipant({ ...newParticipant, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostersUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPosterFiles(prev => [...prev, ...files]);

      const previews = files.map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        posters: [...(prev.posters || []), ...previews]
      }));
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipant.name) {
      setModalContent({
        title: 'Validation Error',
        message: 'Participant name is required',
        onConfirm: null
      });
      setModalOpen(true);
      return;
    }

    // Check for duplicates
    const isDuplicate = (formData.participants || []).some(p =>
      p.name.toLowerCase().replace(/\s+/g, '') === newParticipant.name.toLowerCase().replace(/\s+/g, '')
    );

    if (isDuplicate) {
      setModalContent({
        title: "Validation Error",
        message: "یہ شخص پہلے ہی شامل ہے۔",
        onConfirm: null
      });
      setModalOpen(true);
      return;
    }

    // Initialize pigeonTimes for the new participant
    const totalPigeons = (formData.numPigeons || 0);
    const totalDays = (formData.numDays || 1);
    const initialTimes = Array(totalPigeons * totalDays).fill('');
    const initialDailyStartTimes = Array(totalDays).fill(formData.startTime || '06:00');

    const participantWithTimes = {
      ...newParticipant,
      pigeonTimes: initialTimes,
      dailyStartTimes: initialDailyStartTimes,
      startTime: formData.startTime || '06:00',
      totalTime: "00:00:00"
    };

    const updatedParticipants = [...(formData.participants || []), participantWithTimes];
    const updatedFormData = { ...formData, participants: updatedParticipants };

    // Update local state
    setFormData(updatedFormData);
    setNewParticipant({ name: '', image: '', address: '', phone: '' });
    setParticipantModalOpen(false);

    // If editing, save immediately
    if (selectedTournament) {
      const token = localStorage.getItem('adminToken');
      try {
        // Clean participants before saving
        const cleanedFormData = {
          ...updatedFormData,
          participants: updatedParticipants.map(p =>
            cleanParticipantForSave(p, formData.numDays || 1, formData.startTime || '06:00')
          )
        };

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments/${selectedTournament._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(cleanedFormData),
        });

        if (response.ok) {
          const data = await response.json();
          setSelectedTournament(data);
          fetchTournaments();
        } else {
          console.error("Failed to auto-save participant");
        }
      } catch (error) {
        console.error("Error auto-saving participant:", error);
      }
    }
  };

  const removeParticipant = async (index) => {
    const newParticipants = [...formData.participants];
    newParticipants.splice(index, 1);
    const updatedFormData = { ...formData, participants: newParticipants };
    setFormData(updatedFormData);

    // If editing, save immediately
    if (selectedTournament) {
      const token = localStorage.getItem('adminToken');
      try {
        // Clean participants before saving
        const cleanedFormData = {
          ...updatedFormData,
          participants: newParticipants.map(p =>
            cleanParticipantForSave(p, formData.numDays || 1, formData.startTime || '06:00')
          )
        };

        await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments/${selectedTournament._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(cleanedFormData),
        });
        fetchTournaments();
      } catch (error) {
        console.error("Error auto-saving on remove:", error);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchTournaments();
      await fetchLeagues();
      if (currentUser?.role === 'Super Admin') {
        await fetchAdmins();
      }
    };
    init();
  }, [currentUser?.role, fetchTournaments, fetchLeagues, fetchAdmins]);

  const handleCreateLeague = async (e) => {
    if (e) e.preventDefault();
    if (!leagueFormData.name) return;

    try {
      const token = localStorage.getItem('adminToken');
      const url = editingLeague
        ? `${import.meta.env.VITE_API_BASE_URL}/leagues/${editingLeague._id}`
        : `${import.meta.env.VITE_API_BASE_URL}/leagues`;

      const response = await fetch(url, {
        method: editingLeague ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(leagueFormData)
      });
      if (response.ok) {
        fetchLeagues();
        setShowLeagueModal(false);
        setLeagueFormData({ name: '', description: '', admin: '' });
        setEditingLeague(null);
      }
    } catch (error) {
      console.error("Error saving league:", error);
    }
  };

  const handleDeleteLeague = async (id) => {
    setModalContent({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this league? This will NOT delete tournaments but they will lose their league association.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('adminToken');
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/leagues/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            fetchLeagues();
            setModalOpen(false);
          }
        } catch (error) {
          console.error("Error deleting league:", error);
        }
      }
    });
    setModalOpen(true);
  };

  const handleEditLeague = (league) => {
    setEditingLeague(league);
    setLeagueFormData({
      name: league.name,
      description: league.description || '',
      admin: league.admin?._id || league.admin || ''
    });
    setShowLeagueModal(true);
  };

  const handleEdit = async (t) => {
    const isAssignedAdmin = (t.admin?._id || t.admin) === currentUser?.id;
    const isSuperAdmin = currentUser?.role === 'Super Admin';

    // Check if user is the League Admin for this tournament
    const relatedLeague = leagues.find(l => l.name === t.leagueName);
    const isLeagueAdmin = (relatedLeague?.admin?._id || relatedLeague?.admin) === currentUser?.id;

    if (!isAssignedAdmin && !isSuperAdmin && !isLeagueAdmin) {
      setModalContent({
        title: 'Access Denied',
        message: 'You are not an admin for this tournament or its league.',
        onConfirm: null
      });
      setModalOpen(true);
      return;
    }

    // Fetch full tournament details (including participants) since we only have the summary
    setLoading(true);
    let fullTournament = t;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments/${t._id}`);
      if (response.ok) {
        fullTournament = await response.json();
      }
    } catch (err) {
      console.error("Error fetching full tournament info:", err);
    }
    setLoading(false);

    setSelectedTournament(fullTournament);
    setPosterFiles([]); // Reset file state when switching tournaments

    // Clean participants to ensure proper array structures using helper
    const cleanParticipants = (fullTournament.participants || []).map(p =>
      cleanParticipantForSave(p, fullTournament.numDays || 1, fullTournament.startTime || '06:00')
    );

    setFormData({
      ...initialFormState,
      ...fullTournament,
      admin: fullTournament.admin?._id || fullTournament.admin,
      startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      posters: t.posters || [],
      headline: t.headline || '',
      participants: cleanParticipants,
      firstWinner: t.firstWinner || '',
      firstTime: t.firstTime || '',
      lastWinner: t.lastWinner || '',
      lastTime: t.lastTime || ''
    });

    // Auto-select date index if today matches a tournament date
    let bestIdx = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const flyingDatesArr = fullTournament.flyingDates || [];
    if (flyingDatesArr.length > 0) {
      for (let i = 0; i < flyingDatesArr.length; i++) {
        const d = new Date(flyingDatesArr[i]);
        d.setHours(0, 0, 0, 0);
        if (today.getTime() === d.getTime()) {
          bestIdx = i;
          break;
        } else if (d < today) {
          bestIdx = i;
        }
      }
    }
    setActiveDateIndex(bestIdx);
    setView('edit');
  };

  const handleCreateNew = () => {
    setSelectedTournament(null);
    setFormData(initialFormState);
    setActiveDateIndex(0);
    setView('edit');
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    performSave();
  };

  const performSave = async () => {
    if (formData.noteTimePigeons > formData.numPigeons) {
      setModalContent({
        title: 'Validation Error',
        message: 'Note time pigeons cannot be greater than the number of flying pigeons',
        onConfirm: null
      });
      setModalOpen(true);
      return;
    }

    // Calculate skipping dates (1, 3, 5...)
    const flyingDates = [];
    const start = new Date(formData.startDate);
    for (let i = 0; i < formData.numDays; i++) {
      const nextDate = new Date(start);
      nextDate.setDate(start.getDate() + (i * 2));
      flyingDates.push(nextDate);
    }

    const totalPigeonsPerDay = formData.numPigeons || 0;
    const scoringPigeons = formData.noteTimePigeons || totalPigeonsPerDay;
    const helperPigeons = formData.helperPigeons || 0;
    const updatedParticipants = (formData.participants || []).map(p => {
      // Use the cleaning helper to ensure proper arrays
      const cleaned = cleanParticipantForSave(p, formData.numDays || 1, formData.startTime || '06:00');

      // Calculate total time with the cleaned participant
      cleaned.totalTime = calculateGrandTotal(
        cleaned.pigeonTimes,
        totalPigeonsPerDay,
        formData.startTime,
        formData.numDays || 1,
        scoringPigeons,
        helperPigeons,
        cleaned
      );

      return cleaned;
    });

    // Recalculate winners one last time before saving
    const { firstWinner, firstTime, lastWinner, lastTime } = calculateWinners(updatedParticipants, formData.startTime);

    // Calculate daily winners for each date
    const dailyWinners = flyingDates.map((date, idx) => {
      const winners = calculateWinners(updatedParticipants, formData.startTime, idx, totalPigeonsPerDay);
      return {
        date,
        firstWinner: winners.firstWinner,
        firstTime: winners.firstTime,
        lastWinner: winners.lastWinner,
        lastTime: winners.lastTime
      };
    });

    const tournamentToSave = {
      ...formData,
      participants: updatedParticipants,
      firstWinner,
      firstTime,
      lastWinner,
      lastTime,
      dailyWinners,
      // Store `totalPigeons` as the number of scoring pigeons (numPigeons), helpers remain separate
      totalPigeons: formData.numPigeons || 0,
      flyingDates
    };

    const method = selectedTournament ? 'PUT' : 'POST';
    const url = selectedTournament
      ? `${import.meta.env.VITE_API_BASE_URL}/tournaments/${selectedTournament._id}`
      : `${import.meta.env.VITE_API_BASE_URL}/tournaments`;
    const token = localStorage.getItem('adminToken');

    try {
      // Use FormData for multipart upload (supporting images)
      const formDataToSend = new FormData();

      // Filter out blob URLs from posters - these are local previews.
      // Send only existing server paths as strings.
      const existingPosters = (tournamentToSave.posters || []).filter(p => !p.startsWith('blob:'));

      // Append all fields to FormData
      Object.keys(tournamentToSave).forEach(key => {
        if (key === 'posters') {
          // Send existing poster paths as a JSON string for the backend to parse
          formDataToSend.append('posters', JSON.stringify(existingPosters));
        } else if (Array.isArray(tournamentToSave[key]) || typeof tournamentToSave[key] === 'object') {
          formDataToSend.append(key, JSON.stringify(tournamentToSave[key]));
        } else {
          formDataToSend.append(key, tournamentToSave[key]);
        }
      });

      // Append new poster files
      if (posterFiles && posterFiles.length > 0) {
        posterFiles.forEach(file => {
          formDataToSend.append('posters', file);
        });
      }

      console.log('📤 Sending tournament data via FormData...');
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend,
      });

      if (response.ok) {
        const savedTournament = await response.json();
        setPosterFiles([]); // Clear uploaded files on success

        // Clean the returned tournament data before putting in state
        if (savedTournament.participants) {
          savedTournament.participants = savedTournament.participants.map(p =>
            cleanParticipantForSave(p, formData.numDays || 1, formData.startTime || '06:00')
          );
        }

        // If we were creating, we might want to go to list, 
        // but user asked to remain on screen.
        // Update selectedTournament so subsequent saves work correctly
        setSelectedTournament(savedTournament);
        // Also update formData in case backend modified anything
        setFormData(prev => ({
          ...prev,
          ...savedTournament,
          startDate: savedTournament.startDate ? new Date(savedTournament.startDate).toISOString().split('T')[0] : prev.startDate,
          admin: savedTournament.admin?._id || savedTournament.admin,
          participants: savedTournament.participants
        }));

        fetchTournaments();

        // Success popup removed as per user request
      } else {
        // Handle non-JSON error responses (like 413 Payload Too Large HTML)
        const contentType = response.headers.get("content-type");
        let errorMessage = 'Failed to save tournament';

        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else if (response.status === 413) {
          errorMessage = 'The data is too large to save (images might be too big).';
        }

        console.error("Server error:", errorMessage);
        setModalContent({
          title: 'Error',
          message: errorMessage,
          onConfirm: null
        });
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Error saving tournament:", error);
      setModalContent({
        title: 'Network Error',
        message: 'Could not connect to the server.',
        onConfirm: null
      });
      setModalOpen(true);
    }
  };

  const handleDelete = () => {
    setModalContent({
      title: 'Confirm Delete',
      message: 'Are you sure you want to permanently delete this tournament? This action cannot be undone.',
      confirmText: 'Delete Forever',
      onConfirm: () => performDelete()
    });
    setModalOpen(true);
  };

  const performDelete = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tournaments/${selectedTournament._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setView('list');
        fetchTournaments();
      }
    } catch (error) {
      console.error("Error deleting tournament:", error);
    }
  };

  const renderView = () => {
    const totalPigeonsPerDay = formData.numPigeons || 0;
    const scoringPigeons = formData.noteTimePigeons || totalPigeonsPerDay;
    const helperPigeons = formData.helperPigeons || 0;

    if (view === 'time-entry') {
      const flyingDates = formData.flyingDates || [];

      return (
        <div className="time-entry-view">
          <div className="view-header">
            <div className="header-left">
              <button className="back-btn" onClick={() => setView('edit')}><FaArrowLeft /> Back to Edit</button>
              <div className="header-text-mini">
                <h2>Pigeon Landing Times</h2>
                  <div className="tournament-info-bar">
                    <p>{formData.name}</p>
                    <div className="start-time-global-edit">
                      <FaClock />
                      <span>Tournament Start Time:</span>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleGlobalStartTimeChange(e.target.value)}
                      />
                    </div>
                  </div>
              </div>
            </div>
            <button
              className={`save-btn ${activeDateIndex === null ? 'disabled' : ''}`}
              onClick={activeDateIndex !== null ? handleSave : undefined}
              disabled={activeDateIndex === null}
            >
              <FaSave /> Save All Times
            </button>
          </div>

          <div className="admin-date-selector">
            {flyingDates.map((date, idx) => (
              <button
                key={idx}
                className={`admin-date-btn ${activeDateIndex === idx ? 'active' : ''}`}
                onClick={() => setActiveDateIndex(idx)}
              >
                <span className="tab-label-mini">Day {idx + 1}</span>
                {new Date(date).toISOString().split('T')[0]}
              </button>
            ))}
            <button
              className={`admin-date-btn total-tab ${activeDateIndex === 'total' ? 'active' : ''}`}
              onClick={() => setActiveDateIndex('total')}
            >
              <span className="tab-label-mini">Overall</span>
              Summary
            </button>
          </div>

          {activeDateIndex === null ? (
            <div className="date-selection-prompt">
              <h3><FaCalendarAlt /> Select a Date</h3>
              <p>Please select a flying date above to view and manage pigeon landing times.</p>
            </div>
          ) : (
            (() => {
              const winners = calculateWinners(formData.participants, formData.startTime, activeDateIndex, totalPigeonsPerDay);
              return (
                <>
                  {(winners.firstWinner || winners.lastWinner) && (
                    <div className="winners-snapshot">
                      {winners.firstWinner && (
                        <div className="winner-badge first">
                          <span className="label">
                            {activeDateIndex === 'total' ? 'Overall First Winner:' : `Day ${activeDateIndex + 1} First Winner:`}
                          </span>
                          <span className="name">
                            {winners.firstWinner} {winners.firstTime && `(${winners.firstTime})`}
                          </span>
                        </div>
                      )}
                      {winners.lastWinner && (
                        <div className="winner-badge last">
                          <span className="label">
                            {activeDateIndex === 'total' ? 'Overall Last Winner:' : `Day ${activeDateIndex + 1} Last Winner:`}
                          </span>
                          <span className="name">
                            {winners.lastWinner} {winners.lastTime && `(${winners.lastTime})`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="table-responsive">
                    <table className="time-table">
                      <thead>
                        <tr>
                          <th>Sr.</th>
                          <th>Name</th>
                          {activeDateIndex !== 'total' && <th>Start Time</th>}
                          {activeDateIndex === 'total' ? (
                            flyingDates.map((date, idx) => (
                              <th key={idx}>{new Date(date).toISOString().split('T')[0]}</th>
                            ))
                          ) : (
                            [...Array(totalPigeonsPerDay)].map((_, i) => (
                              <th key={i}>
                                pigeon {i + 1}
                              </th>
                            ))
                          )}
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.participants && formData.participants.length > 0 ? (
                          formData.participants.map((p, pIndex) => (
                            <tr key={pIndex}>
                              <td className="sr-cell">{pIndex + 1}</td>
                              <td className="participant-name-cell">
                                <div className="participant-row-info">
                                  <img src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} alt="" />
                                  <span className="p-name-table">{formatPlayerName(p.name)}</span>
                                </div>
                              </td>

                              {activeDateIndex !== 'total' ? (
                                <>
                                  <td className="start-time-cell">
                                    <input
                                      type="time"
                                      value={(p.dailyStartTimes && p.dailyStartTimes[activeDateIndex]) || p.startTime || formData.startTime}
                                      onChange={(e) => {
                                        handleParticipantStartTimeChange(pIndex, activeDateIndex, e.target.value);
                                      }}
                                      className="start-time-table-input"
                                    />
                                  </td>
                                  {[...Array(totalPigeonsPerDay)].map((_, i) => {
                                    const globalPigeonIdx = (activeDateIndex * totalPigeonsPerDay) + i;
                                    return (
                                      <td key={i} className="time-input-cell">
                                        <input
                                          type="time"
                                          value={p.pigeonTimes && p.pigeonTimes[globalPigeonIdx] ? p.pigeonTimes[globalPigeonIdx] : ''}
                                          onChange={(e) => {
                                            handleTimeChange(pIndex, globalPigeonIdx, e.target.value);
                                          }}
                                        />
                                      </td>
                                    );
                                  })}
                                  <td className="total-time-cell">
                                    {calculateTotalTime(
                                      (p.dailyStartTimes && p.dailyStartTimes[activeDateIndex]) || p.startTime || formData.startTime,
                                      (p.pigeonTimes || []).slice(activeDateIndex * totalPigeonsPerDay, (activeDateIndex + 1) * totalPigeonsPerDay),
                                      scoringPigeons,
                                      helperPigeons
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  {flyingDates.map((_, idx) => {
                                    // For total view, we don't highlight individual boxes easily here 
                                    // as it's a summary of daily totals
                                    const dayStartTime = (p.dailyStartTimes && p.dailyStartTimes[idx]) || p.startTime || formData.startTime;
                                    return (
                                      <td key={idx} className="daily-total-cell">
                                        {calculateTotalTime(
                                          dayStartTime,
                                          (p.pigeonTimes || []).slice(idx * totalPigeonsPerDay, (idx + 1) * totalPigeonsPerDay),
                                          scoringPigeons,
                                          helperPigeons
                                        )}
                                      </td>
                                    )
                                  })}
                                  <td className="grand-total-cell">
                                    {calculateGrandTotal(p.pigeonTimes, totalPigeonsPerDay, formData.startTime, formData.numDays || 1, scoringPigeons, helperPigeons, p)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={totalPigeonsPerDay + 4} className="no-data">
                              No participants added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()
          )}
        </div>
      );
    }

    if (view === 'edit') {
      return (
        <div className="tournament-edit-view">
          <div className="view-header">
            <div className="header-left">
              <button className="back-btn" onClick={() => setView('list')}><FaArrowLeft /> Back</button>
              <h2>{selectedTournament ? 'Edit Tournament' : 'Create Tournament'}</h2>
            </div>
            <div className="header-actions-group">
              {selectedTournament && (
                <button
                  type="button"
                  className="add-person-btn"
                  onClick={() => {
                    setNewParticipant({ name: '', image: '', address: '', phone: '' });
                    setOwnerSearch('');
                    setParticipantModalOpen(true);
                  }}
                >
                  <FaUserPlus /> Add Persons
                </button>
              )}
              <button type="button" className="save-btn" onClick={handleSave}>
                <FaSave /> {selectedTournament ? 'Update Tournament' : 'Create Tournament'}
              </button>
              {selectedTournament && (
                <button className="add-time-btn" onClick={() => setView('time-entry')}>
                  <FaClock /> Add Time
                </button>
              )}
            </div>
          </div>

          <form className="tournament-form" onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group">
                <label>Tournament Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>League Name (Grouping Name)</label>
                <select
                  value={formData.leagueName}
                  onChange={(e) => setFormData({ ...formData, leagueName: e.target.value })}
                  required
                >
                  <option value="Independent">Independent (No League)</option>
                  {(leagues || []).map(league => (
                    <option key={league._id} value={league.name}>{league.name}</option>
                  ))}
                </select>
                <small>Select "Independent" if this doesn't belong to a specific league.</small>
              </div>

              {currentUser?.role === 'Super Admin' && (
                <div className="form-group">
                  <label>Assign to Admin</label>
                  <select
                    value={formData.admin}
                    onChange={(e) => setFormData({ ...formData, admin: e.target.value })}
                    required
                  >
                    <option value="">Select an Admin</option>
                    {(admins || []).map(admin => (
                      <option key={admin._id} value={admin._id}>{admin.name} ({admin.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleGlobalStartTimeChange(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Number of Days (1-12)</label>
                <select
                  value={formData.numDays || 1}
                  onChange={(e) => setFormData({ ...formData, numDays: parseInt(e.target.value) || 1 })}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} Day{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Number of Pigeons</label>
                <input
                  type="number"
                  value={formData.numPigeons || 0}
                  onChange={(e) => setFormData({ ...formData, numPigeons: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Note time for Pigeons</label>
                <input
                  type="number"
                  value={formData.noteTimePigeons || 0}
                  onChange={(e) => setFormData({ ...formData, noteTimePigeons: parseInt(e.target.value) || 0 })}
                />
                <small>Must be ≤ Flying Pigeons</small>
              </div>

              <div className="form-group">
                <label>Helper Pigeons</label>
                <input
                  type="number"
                  value={formData.helperPigeons || 0}
                  onChange={(e) => setFormData({ ...formData, helperPigeons: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Total Pigeons (Auto)</label>
                <input
                  type="number"
                  value={formData.numPigeons || 0}
                  readOnly
                  className="readonly-input"
                />
                <small>Number of scoring pigeons (helpers excluded)</small>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.showOnHome}
                    onChange={(e) => setFormData({ ...formData, showOnHome: e.target.checked })}
                  />
                  Show on Home Screen
                </label>
              </div>

              <div className="form-group full-width">
                <label>Announcement Headline (Moving Text)</label>
                <input
                  type="text"
                  value={formData.headline || ''}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="e.g. کوٹلہ پیجن کی جانب سے تمام کھلاڑیوں کو بیسٹ وشز"
                />
              </div>

              <div className="form-group full-width">
                <label>Tournament Posters (Upload from Gallery)</label>
                <div className="image-input-container">
                  <input
                    type="file"
                    id="poster-upload"
                    multiple
                    accept="image/*"
                    onChange={handlePostersUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() => document.getElementById('poster-upload').click()}
                  >
                    <FaImage /> Select Posters from Gallery
                  </button>
                  <small>You can select multiple images</small>
                </div>
                <div className="poster-preview-list">
                  {(formData.posters || []).map((url, index) => (
                    <div key={index} className="poster-tag">
                      <img src={url} alt={`poster-${index}`} />
                      <button type="button" className="remove-poster" onClick={() => {
                        const indexToRemove = index;
                        const urlToRemove = formData.posters[indexToRemove];

                        setFormData(prev => {
                          const newPosters = [...prev.posters];
                          newPosters.splice(indexToRemove, 1);
                          return { ...prev, posters: newPosters };
                        });

                        if (urlToRemove.startsWith('blob:') || urlToRemove.startsWith('data:')) {
                          // Figure out which file it was. 
                          const blobUrlsBefore = formData.posters.slice(0, indexToRemove).filter(u => u.startsWith('blob:') || u.startsWith('data:')).length;
                          setPosterFiles(prev => {
                            const newFiles = [...prev];
                            if (newFiles.length > blobUrlsBefore) {
                              newFiles.splice(blobUrlsBefore, 1);
                            }
                            return newFiles;
                          });
                        }
                      }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              {selectedTournament && currentUser?.role === 'Super Admin' && (
                <button type="button" className="delete-btn" onClick={handleDelete}>
                  <FaTrash /> Delete
                </button>
              )}
              <button type="submit" className="save-btn">
                <FaSave /> {selectedTournament ? 'Update Tournament' : 'Create Tournament'}
              </button>

              {selectedTournament && (
                <button
                  type="button"
                  className="add-person-btn"
                  onClick={() => {
                    setNewParticipant({ name: '', image: '', address: '', phone: '' });
                    setOwnerSearch('');
                    setParticipantModalOpen(true);
                  }}
                >
                  <FaUserPlus /> Add Persons
                </button>
              )}
            </div>

            {selectedTournament && (
              <div className="participants-section">
                <div className="participants-header">
                  <h3><FaUserFriends /> Enrolled Participants ({(formData.participants || []).length})</h3>
                </div>

                {participantModalOpen && (
                  <div className="modal-overlay">
                    <div className="participant-modal">
                      <div className="modal-header">
                        <h3>Add New Participant</h3>
                        <button type="button" className="close-btn" onClick={() => setParticipantModalOpen(false)}>&times;</button>
                      </div>
                      <div className="modal-body">
                        <div className="form-group">
                          <label>Participant Photo (Gallery)</label>
                          <div className="file-input-wrapper">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              id="participant-photo"
                            />
                            <label htmlFor="participant-photo" className="file-label">
                              {newParticipant.image ? 'Change Photo' : 'Select from Gallery'}
                            </label>
                            {newParticipant.image && (
                              <div className="photo-preview">
                                <img src={newParticipant.image} alt="Preview" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label>Full Name * (Search Global Owners)</label>
                          <input
                            type="text"
                            value={ownerSearch}
                            onChange={(e) => {
                              setOwnerSearch(e.target.value);
                              setNewParticipant({ ...newParticipant, name: e.target.value });
                            }}
                            placeholder="Type to search global owners..."
                          />
                          {showOwnerSuggestions && (
                            <div className="owner-suggestions">
                              {globalOwnersList.map(owner => (
                                <div key={owner._id} className="suggestion-item" onClick={() => handleSelectOwner(owner)}>
                                  <img src={owner.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.name)}`} alt="" />
                                  <div className="suggestion-info">
                                    <span className="suggestion-name">{owner.name}</span>
                                    {owner.phone && <span className="suggestion-phone">{owner.phone}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="form-group">
                          <label>Phone Number (Optional)</label>
                          <input
                            type="text"
                            value={newParticipant.phone}
                            onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                            placeholder="Contact number"
                          />
                        </div>
                        <div className="form-group">
                          <label>Address (Optional)</label>
                          <input
                            type="text"
                            value={newParticipant.address}
                            onChange={(e) => setNewParticipant({ ...newParticipant, address: e.target.value })}
                            placeholder="Full address"
                          />
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={() => setParticipantModalOpen(false)}>Cancel</button>
                        <button type="button" className="confirm-btn" onClick={handleAddParticipant}>Enroll Participant</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="participants-grid">
                  {(formData.participants || []).map((p, index) => (
                    <div key={index} className="participant-card-mini">
                      <img src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} alt={p.name} />
                      <div className="p-details">
                        <span className="p-name">{p.name}</span>
                        {p.phone && <span className="p-phone">{p.phone}</span>}
                      </div>
                      <button type="button" className="p-remove" onClick={() => removeParticipant(index)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      );
    }

    if (view === 'manage-leagues') {
      return (
        <div className="tournaments-section">
          <div className="section-header">
            <button className="back-btn" onClick={() => setView('list')}>
              <FaArrowLeft /> Back to Tournaments
            </button>
            <div className="header-text">
              <h2>Manage Leagues</h2>
              <p>Edit league names and see assigned tournaments</p>
            </div>
            <button className="add-btn league-btn" onClick={() => {
              setEditingLeague(null);
              setLeagueFormData({ name: '', description: '' });
              setShowLeagueModal(true);
            }}>
              <FaPlus /> Add New League
            </button>
          </div>

          <div className="leagues-management-list">
            {leagues.length === 0 ? (
              <p className="no-data">No leagues found.</p>
            ) : (
              <div className="manage-league-grid">
                {leagues.map(league => {
                  const leagueTournaments = tournaments.filter(t => t.leagueName === league.name);
                  return (
                    <div key={league._id} className="manage-league-card">
                      <div className="manage-league-info">
                        <h3>{league.name}</h3>
                        <div className="league-admin-badge" style={{ fontSize: '0.8rem', color: '#065e34', marginBottom: '8px', fontWeight: 'bold' }}>
                          <FaUserShield /> Admin: {league.admin?.name || 'Super Admin Only'}
                        </div>
                        <p>{league.description || "No description"}</p>
                        <div className="league-stats-mini">
                          <strong>{leagueTournaments.length}</strong> Tournaments
                        </div>
                      </div>

                      <div className="league-tournaments-preview">
                        <h4>Assigned Tournaments:</h4>
                        {leagueTournaments.length > 0 ? (
                          <ul>
                            {leagueTournaments.slice(0, 5).map(t => (
                              <li key={t._id}>{t.name}</li>
                            ))}
                            {leagueTournaments.length > 5 && <li>... and {leagueTournaments.length - 5} more</li>}
                          </ul>
                        ) : (
                          <p className="no-tourneys">No tournaments assigned</p>
                        )}
                      </div>

                      <div className="manage-league-actions">
                        <button className="edit-btn" onClick={() => handleEditLeague(league)}>
                          <FaEdit /> Edit League
                        </button>
                        <button className="delete-btn-league" onClick={() => handleDeleteLeague(league._id)}>
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="tournaments-section">
        <div className="section-header">
          <div className="header-text">
            <h2>Tournament Management</h2>
            <p>View and manage all your pigeon flying tournaments</p>
          </div>
          {currentUser?.role === 'Super Admin' && (
            <div className="admin-actions">
              <button className="add-btn league-btn" onClick={() => setView('manage-leagues')}>
                <FaUsers /> Manage Leagues
              </button>
              <button className="add-btn league-btn" onClick={() => {
                setEditingLeague(null);
                setLeagueFormData({ name: '', description: '' });
                setShowLeagueModal(true);
              }}>
                <FaPlus /> Create a League
              </button>
              <button className="add-btn" onClick={handleCreateNew}>
                <FaPlus /> New Tournament
              </button>
            </div>
          )}
        </div>

            <div className="tournaments-list">
          {!tournaments || tournaments.length === 0 ? (
            <p className="no-data">No tournaments found. Click "New Tournament" to add one.</p>
          ) : (
            <div className="tournament-grid">
              {(tournaments || []).map((t) => {
                const isUserAdmin = (t.admin?._id || t.admin) === currentUser?.id;
                const leagueForTournament = leagues.find(l => l.name === t.leagueName);
                const isLeagueAdmin = (leagueForTournament?.admin?._id || leagueForTournament?.admin) === currentUser?.id;
                const canEdit = isUserAdmin || isLeagueAdmin || currentUser?.role === 'Super Admin';
                return (
                  <div
                    key={t._id}
                    className={`tournament-card ${isUserAdmin ? 'my-tournament' : ''} ${!canEdit ? 'view-only-card' : ''}`}
                    onClick={canEdit ? () => handleEdit(t) : undefined}
                  >
                    <button
                      className="copy-link-btn"
                      onClick={(e) => handleCopyLink(t.shortCode, t._id, e)}
                      title="Copy Tournament Link"
                    >
                      <FaLink /> Copy Link
                    </button>
                    {t.posters && t.posters.length > 0 && (
                      <div className="card-poster-preview">
                        <img src={t.posters[0]} alt="Tournament Poster" />
                      </div>
                    )}
                    <div className="card-top">
                      <span className={`status-badge ${t.status.toLowerCase()}`}>{t.status}</span>
                      <div className="card-icon"><FaTrophy /></div>
                    </div>
                    <div className="card-info">
                      <h3>{t.name}</h3>
                      <div className="card-details">
                        <div className="detail-item">
                          <FaUserShield className="detail-icon" />
                          <span>{t.admin?.name || 'Unassigned'}</span>
                        </div>
                        <div className="detail-item">
                          <FaCalendarAlt className="detail-icon" />
                          <span>{t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : 'No date'} {t.startTime || ''}</span>
                        </div>
                        <div className="detail-item">
                          <FaDove className="detail-icon" />
                          <span>
                            {t.numPigeons || t.totalPigeons || 0} Pigeons
                            {t.helperPigeons ? ` / ${t.helperPigeons} Helpers` : null}
                          </span>
                        </div>
                        <div className="detail-item">
                          <FaClock className="detail-icon" />
                          <span>{t.numDays} Days</span>
                        </div>
                      </div>

                      {(t.firstWinner || t.lastWinner) && (
                        <div className="card-winners-mini">
                          {t.firstWinner && (
                            <div className="winner-small-badge first">
                              1st: {t.firstWinner} {t.firstTime && `(${t.firstTime})`}
                            </div>
                          )}
                          {t.lastWinner && (
                            <div className="winner-small-badge last">
                              Last: {t.lastWinner} {t.lastTime && `(${t.lastTime})`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="card-footer">
                      <button className="edit-link">
                        {canEdit ? 'Edit Details' : 'View Only'}
                      </button>
                      {isUserAdmin && <span className="admin-badge">My Tournament</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderView()}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalContent.title}
        message={modalContent.message}
        onConfirm={modalContent.onConfirm}
        confirmText={modalContent.confirmText}
      />

      {showLeagueModal && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content league-modal">
            <div className="modal-header">
              <h3>{editingLeague ? 'Edit League' : 'Create New League'}</h3>
              <button className="close-btn" onClick={() => {
                setShowLeagueModal(false);
                setEditingLeague(null);
                setLeagueFormData({ name: '', description: '', admin: '' });
              }}>&times;</button>
            </div>
            <form onSubmit={handleCreateLeague}>
              {currentUser?.role === 'Super Admin' && (
                <div className="form-group">
                  <label>Assign League Admin</label>
                  <select
                    value={leagueFormData.admin}
                    onChange={(e) => setLeagueFormData({ ...leagueFormData, admin: e.target.value })}
                  >
                    <option value="">No Admin assigned (Super Admin only)</option>
                    {admins.map(admin => (
                      <option key={admin._id || admin.id} value={admin._id || admin.id}>
                        {admin.name} ({admin.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>League Name</label>
                <input
                  type="text"
                  value={leagueFormData.name}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, name: e.target.value })}
                  required
                  placeholder="e.g. Asia Cup, World League"
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={leagueFormData.description}
                  onChange={(e) => setLeagueFormData({ ...leagueFormData, description: e.target.value })}
                  placeholder="Enter league details..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowLeagueModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create League</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Tournaments;
