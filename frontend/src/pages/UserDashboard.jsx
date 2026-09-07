import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Bike, Wallet, Calendar, MapPin, Search, LogOut, CheckCircle2, XCircle, History, CreditCard, Navigation, Clock, Sparkles, User, Sun, Moon } from 'lucide-react';
import axios from 'axios';
const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return '/api';
    }
    return 'http://localhost:5000/api';
};

const api = axios.create({ baseURL: getBaseURL() });

const getDynamicPricingContext = (bikeBase, carBase, selectedHour, dateString, occupancyPercentage) => {
    let surge = 1.0;
    let demandLevel = "Normal";
    let availabilityPrediction = "Steady availability.";
    
    const d = new Date(dateString || new Date());
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    
    if (selectedHour >= 12 && selectedHour <= 16) {
        surge = 1.5;
        demandLevel = "High Demand Hour (12PM - 4PM)";
        availabilityPrediction = "High demand window active.";
    } else if (isWeekend) {
        surge = 1.2;
        demandLevel = "Weekend Surcharge (Sat/Sun)";
        availabilityPrediction = "Weekend rate applied.";
    } else if (occupancyPercentage !== undefined && occupancyPercentage < 20) {
        surge = 0.8;
        demandLevel = "Empty Slot Threshold (<20% full)";
        availabilityPrediction = "Lots of free slots, discount active.";
    }

    return {
        bikePrice: Math.ceil(bikeBase * surge),
        carPrice: Math.ceil(carBase * surge),
        surgeMultiplier: surge,
        demandLevel,
        availabilityPrediction
    };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
};

export default function UserDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const userLocationRef = useRef(null);
    const [user, setUser] = useState({});
    const [balance, setBalance] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState(false);
    const [slots, setSlots] = useState([]);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [globalLocks, setGlobalLocks] = useState([]);
    const [bookingType, setBookingType] = useState('instant'); // 'instant' or 'prebook'
    const currentDate = new Date().toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    const [bookingDetails, setBookingDetails] = useState({ date: currentDate, time: currentTime, duration: 60, vehicleNumber: '', carModel: '', paymentMethod: 'Wallet' });
    const [extendingBooking, setExtendingBooking] = useState(null);
    const [extensionDuration, setExtensionDuration] = useState(30);
    const [extensionConflict, setExtensionConflict] = useState(null);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'book'); // book, wallet, history
    const [toastMessage, setToastMessage] = useState(location.state?.toastMessage || null);
    
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const [history, setHistory] = useState([]);
    const [addMoneyAmount, setAddMoneyAmount] = useState('');
    const [showUPIModal, setShowUPIModal] = useState(false);
    const [isWaitingForAppReturn, setIsWaitingForAppReturn] = useState(false);
    const [isLightMode, setIsLightMode] = useState(localStorage.getItem('theme') === 'light');

    // Edit Profile States
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [editProfileName, setEditProfileName] = useState('');
    const [editProfilePhone, setEditProfilePhone] = useState('');
    const [editProfilePassword, setEditProfilePassword] = useState('');
    const [editProfileConfirmPassword, setEditProfileConfirmPassword] = useState('');
    const [editProfileLoading, setEditProfileLoading] = useState(false);
    const [editProfileError, setEditProfileError] = useState('');

    const toggleTheme = () => {
        const newTheme = !isLightMode;
        setIsLightMode(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
        }
    };


    useEffect(() => {
        if (isLightMode) document.documentElement.classList.add('light-mode');
        else document.documentElement.classList.remove('light-mode');
        const localUser = JSON.parse(localStorage.getItem('user'));
        if (!localUser) {
            navigate('/login');
        } else {
            setUser(localUser);
            setBalance(localUser.walletBalance || 500);
        }

        const fetchSlots = async () => {
            try {
                const res = await api.get('/slots');
                const dbBranches = res.data.map(s => {
                    let dist = '0.0';
                    if (userLocationRef.current) {
                        dist = calculateDistance(userLocationRef.current.lat, userLocationRef.current.lng, s.coordinates?.lat || 0, s.coordinates?.lng || 0);
                    }
                    return {
                        id: s._id,
                        name: s.locationName,
                        available: true,
                        distance: dist,
                        bikePrice: s.bikePrice,
                        carPrice: s.carPrice,
                        lat: s.coordinates?.lat || 0,
                        lng: s.coordinates?.lng || 0,
                        carSpaces: s.carSpaces || 10,
                        bikeSpaces: s.bikeSpaces || 5,
                        isAiEnabled: s.isAiEnabled !== false
                    };
                });
                
                const allBranches = [...dbBranches];
                const currentHour = parseInt(currentTime.split(':')[0]);
                const pricedBranches = allBranches.map(branch => {
                    let branchPrices = {};
                    if (branch.isAiEnabled === false) {
                        branchPrices = {
                            ...branch,
                            bikePriceDynamic: branch.bikePrice,
                            carPriceDynamic: branch.carPrice,
                            aiContext: { surgeMultiplier: 1.0, demandLevel: 'Normal', availabilityPrediction: 'Custom Static Pricing' }
                        };
                    } else {
                        const aiContext = getDynamicPricingContext(branch.bikePrice, branch.carPrice, currentHour, currentDate, 50);
                        branchPrices = {
                            ...branch,
                            bikePriceDynamic: aiContext.bikePrice,
                            carPriceDynamic: aiContext.carPrice,
                            aiContext
                        };
                    }
                    
                    // Instantly sync the currently selected slot so the UI doesn't require a re-click!
                    setSelectedSlot(prev => {
                        if (prev && prev.id === branch.id) {
                            return { ...prev, ...branchPrices };
                        }
                        return prev;
                    });
                    
                    return branchPrices;
                });
                
                setSlots(pricedBranches);
            } catch (err) {
                console.error("Failed to fetch slots from DB", err);
            }
        };
        fetchSlots();

        // Retrieve isolated personal bookings locally specifically for THIS user
        const savedHistory = JSON.parse(localStorage.getItem(`NETPark_BookingHistory_${localUser?.email}`)) || [];
        setHistory(savedHistory);

        // Real-time Global Lock Polling System
        const fetchLocks = async () => {
            try {
                const res = await api.get('/auth/active-locks');
                setGlobalLocks(res.data);
            } catch (e) {
                console.error("Lock sync failed");
            }
        };
        fetchLocks();
        const lockInterval = setInterval(() => {
            fetchLocks();
            fetchSlots();
        }, 3000); // Sink every 3 seconds to ensure real-time UI state
        return () => clearInterval(lockInterval);
    }, [navigate]);

    const handleOpenEditProfile = () => {
        setEditProfileName(user.name || '');
        setEditProfilePhone(user.phone || '');
        setEditProfilePassword('');
        setEditProfileConfirmPassword('');
        setEditProfileError('');
        setShowEditProfileModal(true);
    };

    const handleEditProfileSubmit = async (e) => {
        e.preventDefault();
        setEditProfileError('');
        
        if (editProfilePassword && editProfilePassword !== editProfileConfirmPassword) {
            setEditProfileError('Passwords do not match.');
            return;
        }

        const phoneDigits = editProfilePhone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
            setEditProfileError('Phone number must be exactly 10 digits.');
            return;
        }

        setEditProfileLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                userId: user.id || user._id,
                name: editProfileName,
                phone: editProfilePhone
            };
            if (editProfilePassword) {
                payload.password = editProfilePassword;
            }

            const res = await api.put('/auth/profile', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update user state and localStorage
            const updatedUser = {
                ...user,
                name: res.data.user.name,
                phone: res.data.user.phone,
                walletBalance: res.data.user.walletBalance
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Show success message and close modal
            setToastMessage('Profile successfully updated!');
            setShowEditProfileModal(false);
        } catch (err) {
            console.error(err);
            setEditProfileError(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setEditProfileLoading(false);
        }
    };

    useEffect(() => {
        const currentHour = parseInt(bookingDetails.time.split(':')[0]) || new Date().getHours();
        setSlots(prevSlots => prevSlots.map(slot => {
            if (slot.isAiEnabled === false) {
                if (selectedSlot && selectedSlot.id === slot.id) {
                     setSelectedSlot(prev => ({...prev, bikePriceDynamic: slot.bikePrice, carPriceDynamic: slot.carPrice, aiContext: { surgeMultiplier: 1.0, demandLevel: 'Normal', availabilityPrediction: 'Custom Static Pricing' }}));
                }
                return {
                    ...slot,
                    bikePriceDynamic: slot.bikePrice,
                    carPriceDynamic: slot.carPrice,
                    aiContext: { surgeMultiplier: 1.0, demandLevel: 'Normal', availabilityPrediction: 'Custom Static Pricing' }
                };
            }

            const branchLocks = globalLocks.filter(l => l.branchId === slot.id).length;
            const totalSp = (slot.carSpaces || 10) + (slot.bikeSpaces || 5);
            const occPct = (branchLocks / totalSp) * 100;
            const aiContext = getDynamicPricingContext(slot.bikePrice, slot.carPrice, currentHour, bookingDetails.date, occPct);
            
            // Sync selected slot pricing
            if (selectedSlot && selectedSlot.id === slot.id) {
                 setSelectedSlot(prev => ({...prev, bikePriceDynamic: aiContext.bikePrice, carPriceDynamic: aiContext.carPrice, aiContext}));
            }
            return {
                ...slot,
                bikePriceDynamic: aiContext.bikePrice,
                carPriceDynamic: aiContext.carPrice,
                aiContext
            };
        }));
    }, [bookingDetails.time, bookingDetails.date, globalLocks]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && isWaitingForAppReturn && showUPIModal !== false) {
                // User has returned from UPI App!
                setIsWaitingForAppReturn(false);
                setTimeout(() => {
                    const txnRef = window.prompt("Awaiting Payment Confirmation...\n\nPlease enter the 12-digit UPI Reference/Transaction Number from your payment receipt to secure your booking:");
                    if (txnRef && txnRef.trim().length >= 10) {
                        finalizeBooking(showUPIModal);
                    } else {
                        setToastMessage({ text: "ERROR: Sequence aborted. Valid UPI Transaction ID was not provided. Booking cancelled.", type: 'error' });
                    }
                }, 500);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isWaitingForAppReturn, showUPIModal]);

    useEffect(() => {
        if (extendingBooking) {
            const bId = extendingBooking.branchId || slots.find(s => s.name === extendingBooking.slotName)?.id;
            if (!bId) {
                 setExtensionConflict(null);
                 return;
            }
            const targetStartMs = new Date(`${extendingBooking.date}T${extendingBooking.time || '00:00'}:00`).getTime() + (extendingBooking.duration * 60 * 1000);
            const targetEndMs = targetStartMs + (extensionDuration * 60 * 1000);

            const relevantLocks = globalLocks.filter(l => 
                l.branchId === bId && l.spaceId === extendingBooking.spaceId && l.id !== extendingBooking.id
            );

            const conflicts = relevantLocks.filter(l => l.startMs < targetEndMs && l.endMs > targetStartMs).sort((a,b) => a.startMs - b.startMs);

            if (conflicts.length > 0) {
                const earliest = conflicts[0];
                if (earliest.startMs > targetStartMs) {
                    const availableMins = Math.floor((earliest.startMs - targetStartMs) / 60000);
                    if (extensionDuration <= availableMins) {
                         setExtensionConflict(null);
                    } else {
                         setExtensionConflict({ type: 'partial', availableMins, conflictTime: new Date(earliest.startMs).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                    }
                } else {
                    let altSpace = null;
                    for (let i = 0; i < 15; i++) {
                        if (i === extendingBooking.spaceId) continue;
                        if ((extendingBooking.spaceId < 10 && i >= 10) || (extendingBooking.spaceId >= 10 && i < 10)) continue;
                        
                        const isAltOccupied = globalLocks.some(l => 
                            l.branchId === bId && l.spaceId === i &&
                            l.startMs < targetEndMs && l.endMs > targetStartMs
                        );
                        if (!isAltOccupied) {
                            altSpace = i;
                            break;
                        }
                    }
                    setExtensionConflict({ type: 'hard', altSpace, conflictTime: new Date(earliest.startMs).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                }
            } else {
                setExtensionConflict(null);
            }
        }
    }, [extensionDuration, extendingBooking, globalLocks, slots]);

    const handleConfirmExtension = async () => {
        const costPerMin = extendingBooking.amount / extendingBooking.duration;
        const additionalCost = Math.ceil(costPerMin * extensionDuration);

        if (balance < additionalCost) { setToastMessage({ text: "Insufficient balance! Please add funds in the Wallet tab.", type: 'error' }); return; }
        
        const bId = extendingBooking.branchId || slots.find(s => s.name === extendingBooking.slotName)?.id;
        try {
            await api.post('/auth/send-booking-receipt', {
                email: user?.email,
                name: user?.name,
                slotName: extendingBooking.slotName,
                duration: extensionDuration,
                amount: additionalCost,
                branchId: bId,
                spaceId: extendingBooking.spaceId,
                phone: user?.phone,
                startMs: new Date(`${extendingBooking.date}T${extendingBooking.time}:00`).getTime() + (extendingBooking.duration * 60 * 1000),
                endMs: new Date(`${extendingBooking.date}T${extendingBooking.time}:00`).getTime() + ((extendingBooking.duration + extensionDuration) * 60 * 1000),
                carNumber: extendingBooking.vehicleNumber,
                carModel: extendingBooking.carModel || 'Not Provided',
                paymentMethod: 'Wallet',
                paymentStatus: 'Verified'
            });
        } catch(e) {}

        setBalance(b => b - additionalCost);

        const newHistory = history.map(h => {
            if (h.id === extendingBooking.id) {
                return {
                    ...h,
                    duration: h.duration + extensionDuration,
                    amount: h.amount + additionalCost
                };
            }
            return h;
        });
        setHistory(newHistory);
        localStorage.setItem(`NETPark_BookingHistory_${user?.email}`, JSON.stringify(newHistory));
        setToastMessage(`Successfully extended booking by ${extensionDuration} mins!`);
        setExtendingBooking(null);
    };

    const handleBookAlternative = async () => {
        const targetStartMs = new Date(`${extendingBooking.date}T${extendingBooking.time || '00:00'}:00`).getTime() + (extendingBooking.duration * 60 * 1000);
        const altStartDate = new Date(targetStartMs).toISOString().split('T')[0];
        const altStartTime = new Date(targetStartMs).toTimeString().slice(0, 5);

        const costPerMin = extendingBooking.amount / extendingBooking.duration;
        const additionalCost = Math.ceil(costPerMin * extensionDuration);

        if (balance < additionalCost) { setToastMessage({ text: "Insufficient balance! Please add funds.", type: 'error' }); return; }

        const bId = extendingBooking.branchId || slots.find(s => s.name === extendingBooking.slotName)?.id;
        try {
            await api.post('/auth/send-booking-receipt', {
                email: user?.email,
                name: user?.name,
                slotName: extendingBooking.slotName,
                duration: extensionDuration,
                amount: additionalCost,
                branchId: bId,
                spaceId: extensionConflict.altSpace,
                phone: user?.phone,
                startMs: targetStartMs,
                endMs: targetStartMs + (extensionDuration * 60 * 1000),
                carNumber: extendingBooking.vehicleNumber,
                carModel: extendingBooking.carModel || 'Not Provided',
                paymentMethod: 'Wallet',
                paymentStatus: 'Verified'
            });
        } catch(e) {}

        setBalance(b => b - additionalCost);

        const newBookingNode = {
            id: Date.now(),
            slotName: extendingBooking.slotName,
            branchId: bId,
            spaceId: extensionConflict.altSpace,
            date: altStartDate,
            time: altStartTime,
            duration: extensionDuration,
            amount: additionalCost,
            status: 'Active',
            vehicleNumber: extendingBooking.vehicleNumber,
            carModel: extendingBooking.carModel || 'Not Provided'
        };

        const newHistory = [newBookingNode, ...history];
        setHistory(newHistory);
        localStorage.setItem(`NETPark_BookingHistory_${user?.email}`, JSON.stringify(newHistory));
        setToastMessage(`Successfully moved vehicle & booked Alternative Space ${extensionConflict.altSpace < 10 ? 'C-'+(extensionConflict.altSpace+1) : 'B-'+(extensionConflict.altSpace-9)} for ${extensionDuration} mins!`);
        setExtendingBooking(null);
    };



    const handleSearch = (overrideQuery) => {
        const query = (typeof overrideQuery === 'string' ? overrideQuery : searchQuery).toLowerCase();
        
        // Calculate mock user origin based on their query input, falling back dynamically
        let userLat = 15.366138;
        let userLng = 75.118796; // Default to Vidya Nagar center
        
        if (query.includes('gokul')) { userLat = 15.350735; userLng = 75.106196; }
        else if (query.includes('keshwapur')) { userLat = 15.360716; userLng = 75.124945; }
        else if (query.includes('hosur') || query.includes('housar')) { userLat = 15.362352; userLng = 75.117154; }
        else if (query.includes('nava') || query.includes('navagar')) { userLat = 15.398652; userLng = 75.062716; }

        // Dynamically calculate straight-line proximity and re-sort branches
        const updatedSlots = slots.map(slot => ({
            ...slot,
            distance: `${calculateDistance(userLat, userLng, slot.lat, slot.lng)}`
        })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

        setSlots([...updatedSlots]);
    };

    const handleAIBooking = () => {
        if (!navigator.geolocation) {
            setToastMessage({ text: "Geolocation is not supported by your browser.", type: 'error' });
            // Fallback to old logic if no geolocation support
            const availableSlots = slots.filter(s => s.available);
            if (availableSlots.length > 0) {
                const best = availableSlots.sort((a, b) => (parseFloat(a.distance) * a.price) - (parseFloat(b.distance) * b.price))[0];
                setAiSuggestion({
                    slot: best,
                    reason: 'AI selected based on optimal distance & dynamic lowest pricing algorithms.'
                });
            }
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                userLocationRef.current = { lat: userLat, lng: userLng };
                
                // Recalculate distances for all slots based on actual location
                const updatedSlots = slots.map(slot => ({
                    ...slot,
                    distance: `${calculateDistance(userLat, userLng, slot.lat, slot.lng)}`
                })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
                
                setSlots([...updatedSlots]);

                const availableSlots = updatedSlots.filter(s => s.available);
                if (availableSlots.length > 0) {
                    // AI Logic: Nearest + Cheapest combination
                    const best = availableSlots.sort((a, b) => (parseFloat(a.distance) * a.price) - (parseFloat(b.distance) * b.price))[0];
                    setAiSuggestion({
                        slot: best,
                        reason: 'AI selected based on optimal distance from your actual location & dynamic lowest pricing.'
                    });
                } else {
                    setToastMessage({ text: 'No available slots nearest to you currently.', type: 'error' });
                }
            },
            (error) => {
                setToastMessage({ text: "Location access denied or failed. Please allow location access so AI can find the nearest slot.", type: 'error' });
                // Fallback to default
            }
        );
    };

    const finalizeBooking = async (totalAmount) => {
        try {
            await api.post('/auth/send-booking-receipt', {
                email: JSON.parse(localStorage.getItem('user'))?.email,
                name: JSON.parse(localStorage.getItem('user'))?.name,
                slotName: selectedSlot.name,
                duration: bookingDetails.duration,
                amount: totalAmount,
                lat: selectedSlot.lat,
                lng: selectedSlot.lng,
                branchId: selectedSlot.id,
                spaceId: selectedSpace,
                phone: user?.phone,
                startMs: new Date(`${bookingDetails.date}T${bookingDetails.time}:00`).getTime(),
                endMs: new Date(`${bookingDetails.date}T${bookingDetails.time}:00`).getTime() + (bookingDetails.duration * 60 * 1000),
                carNumber: bookingDetails.vehicleNumber,
                carModel: bookingDetails.carModel,
                paymentMethod: bookingDetails.paymentMethod,
                paymentStatus: bookingDetails.paymentMethod === 'Pay at Counter' ? 'Pending' : 'Verified'
            });
        } catch (e) {
            if (e.response && e.response.data && e.response.data.message) {
                setToastMessage({ text: e.response.data.message, type: 'error' });
            } else {
                setToastMessage({ text: 'Secure backend pipeline failed. Try again.', type: 'error' });
            }
            return;
        }
        
        if (bookingDetails.paymentMethod === 'Wallet') setBalance(prev => prev - totalAmount);

        const newBooking = {
            id: Date.now(),
            slotName: selectedSlot.name,
            branchId: selectedSlot.id,
            spaceId: selectedSpace,
            date: bookingDetails.date,
            time: bookingDetails.time,
            duration: bookingDetails.duration,
            amount: totalAmount,
            status: 'Active',
            vehicleNumber: bookingDetails.vehicleNumber,
            carModel: bookingDetails.carModel
        };

        const newHistory = [newBooking, ...history];
        setHistory(newHistory);
        
        const localUser = JSON.parse(localStorage.getItem('user'));
        localStorage.setItem(`NETPark_BookingHistory_${localUser?.email}`, JSON.stringify(newHistory));

        const res = await api.get('/auth/active-locks').catch(()=>({data:[]}));
        if(res.data) setGlobalLocks(res.data);

        setToastMessage(`Success! Set reservation at ${selectedSlot.name} via ${bookingDetails.paymentMethod}. Live tracking receipt and GPS directions sent to your email!`);
        setSelectedSlot(null);
        setSelectedSpace(null);
        setShowUPIModal(false);
    };

    const handleBook = async () => {
        if (selectedSpace === null) {
            setToastMessage({ text: 'Please select a specific parking space from the grid first.', type: 'error' });
            return;
        }
        
        if (!bookingDetails.date || !bookingDetails.time) {
            setToastMessage({ text: 'ACCESS DENIED: You must provide an exact Date and Time for your reservation.', type: 'error' });
            return;
        }

        const vehicleRegex = /^[A-Za-z]{2}\s?[0-9]{1,2}\s?[A-Za-z]{1,3}\s?[0-9]{1,4}$/;
        if (!bookingDetails.vehicleNumber || !vehicleRegex.test(bookingDetails.vehicleNumber.trim())) {
            setToastMessage({ text: 'ERROR: Please enter a valid Vehicle Number plate (e.g. KA 25 AB 1234).', type: 'error' });
            return;
        }

        if (!bookingDetails.carModel || bookingDetails.carModel.trim() === '') {
            setToastMessage({ text: 'ERROR: Please enter your Car Model.', type: 'error' });
            return;
        }

        const carSp = selectedSlot.carSpaces || 10;
        const isCar = selectedSpace < carSp;
        const baseRate = isCar ? selectedSlot.carPriceDynamic : selectedSlot.bikePriceDynamic;
        const total = Math.ceil(baseRate * (bookingDetails.duration / 60));

        if (bookingDetails.date !== currentDate && bookingDetails.paymentMethod === 'Pay at Counter') {
            setToastMessage({ text: "Pay at Counter is not allowed for advance pre-bookings. Please use a digital payment method.", type: 'error' });
            return;
        }
        
        if (bookingDetails.paymentMethod === 'Wallet') {
            if (balance < total) {
                setToastMessage({ text: 'Insufficient wallet balance!', type: 'error' });
                return;
            }
        }

        if (bookingDetails.paymentMethod === 'UPI') {
            setShowUPIModal(total);
            return;
        }

        await finalizeBooking(total);
    };

    const handleAddMoney = (e) => {
        e.preventDefault();
        const amt = parseFloat(addMoneyAmount);
        if (amt && amt > 0) {
            setBalance(prev => prev + amt);
            setToastMessage(`₹${amt} added securely via Payment Gateway.`);
            setAddMoneyAmount('');
        }
    };

    return (
        <div style={{ minHeight: '100vh', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        style={{
                            position: 'fixed',
                            bottom: '30px',
                            left: '50%',
                            background: 'var(--card-bg)',
                            border: `1px solid ${typeof toastMessage === 'object' && toastMessage.type === 'error' ? 'var(--danger)' : '#00f5d4'}`,
                            padding: '15px 25px',
                            borderRadius: '8px',
                            zIndex: 9999,
                            boxShadow: `0 4px 20px ${typeof toastMessage === 'object' && toastMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 245, 212, 0.2)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        {typeof toastMessage === 'object' && toastMessage.type === 'error' ? (
                            <XCircle color="var(--danger)" size={24} />
                        ) : (
                            <CheckCircle2 color="#00f5d4" size={24} />
                        )}
                        <span style={{ color: 'var(--text-light)', fontWeight: '500' }}>
                            {typeof toastMessage === 'object' ? toastMessage.text : toastMessage}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Minimal Modern Header */}
            <header className="header" style={{ marginBottom: '30px', borderRadius: '12px' }}>
                <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('book')}>
                    <Car color="var(--royal-gold)" /> NETPark
                </div>
                
                {/* Navigation Tabs */}
                <div style={{ display: 'flex', gap: '20px' }}>
                    <button onClick={() => setActiveTab('book')} style={{ background: 'none', border: 'none', color: activeTab === 'book' ? 'var(--royal-gold)' : 'var(--text-light)', cursor: 'pointer', fontWeight: activeTab === 'book' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Search size={18} /> Booking
                    </button>
                    <button onClick={() => setActiveTab('wallet')} style={{ background: 'none', border: 'none', color: activeTab === 'wallet' ? 'var(--royal-gold)' : 'var(--text-light)', cursor: 'pointer', fontWeight: activeTab === 'wallet' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Wallet size={18} /> Wallet
                    </button>
                    <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: activeTab === 'history' ? 'var(--royal-gold)' : 'var(--text-light)', cursor: 'pointer', fontWeight: activeTab === 'history' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <History size={18} /> History
                    </button>
                    <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? 'var(--royal-gold)' : 'var(--text-light)', cursor: 'pointer', fontWeight: activeTab === 'profile' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <User size={18} /> Profile
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-light)', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }} onClick={toggleTheme}>
                        {isLightMode ? <Moon size={18} color="var(--royal-purple)" /> : <Sun size={18} color="var(--royal-gold)" />}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-bg)', padding: '5px 15px', borderRadius: '20px', border: '1px solid var(--royal-gold)' }}>
                        <Wallet size={18} color="var(--royal-gold)" />
                        <span style={{ fontWeight: 'bold' }}>₹{balance}</span>
                    </div>
                    <button className="btn-primary" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={() => navigate('/login')}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'book' && (
                    <motion.div key="book" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
                        {/* Left Column: Search & AI Suggestion */}
                        <div className="card" style={{ gridColumn: 'span 1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0 }}><Search size={22} style={{ verticalAlign: 'middle', marginRight: '10px' }} />Find Parking</h2>
                                <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px' }} onClick={handleAIBooking}>
                                    <Sparkles size={16} /> Search Nearest Place
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 50 }}>
                                <motion.input
                                    animate={searchError ? { x: [-10, 10, -10, 10, 0] } : {}}
                                    transition={{ duration: 0.4 }}
                                    placeholder="Enter location, event, or use current..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSearchError(false);
                                        handleSearch(e.target.value);
                                    }}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${searchError ? 'red' : 'var(--royal-gold)'}`, background: 'transparent', color: 'var(--text-light)' }}
                                />
                                <button className="btn-primary" style={{ marginTop: '8px', minWidth: '80px' }} onClick={() => {
                                    if (searchQuery.trim() === '') return;
                                    const matchFound = slots.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
                                    if (!matchFound) {
                                        setSearchError(true);
                                    } else {
                                        setSearchError(false);
                                        handleSearch(searchQuery);
                                    }
                                }}>Find</button>
                                
                                {searchError && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, color: 'red', fontSize: '13px', marginTop: '5px' }}>
                                        Please enter the correct location
                                    </div>
                                )}
                                
                                {searchQuery.length > 0 && slots.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: '90px', background: 'var(--royal-blue)', border: '1px solid var(--royal-gold)', borderRadius: '8px', marginTop: '5px', zIndex: 100, backdropFilter: 'blur(10px)', boxShadow: '0 5px 20px rgba(0,0,0,0.5)' }}>
                                        {slots.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                                            <div 
                                                key={s.id} 
                                                style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--text-light)', fontSize: '14px', display: 'flex', justifyContent: 'space-between', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,183,3,0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                onClick={() => {
                                                    setSearchQuery(s.name);
                                                    handleSearch(s.name);
                                                    navigate('/book', { state: { slot: s } });
                                                }}
                                            >
                                                <span><MapPin size={14} style={{ display: 'inline-block', marginRight: '5px', color: 'var(--royal-gold)' }}/> {s.name}</span>
                                                <span style={{ color: 'var(--royal-gold)', fontWeight: 'bold' }}>₹{s.price}/hr</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {aiSuggestion && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    style={{ background: 'linear-gradient(135deg, rgba(58,12,163,0.3), rgba(10,17,40,0.8))', border: '1px solid var(--royal-gold)', padding: '20px', borderRadius: '12px', marginTop: '20px', boxShadow: '0 0 20px rgba(255,183,3,0.15)' }}
                                >
                                    <h3 style={{ color: 'var(--royal-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={18} /> AI Smart Recommendation
                                    </h3>
                                    <p style={{ fontSize: '13px', margin: '10px 0', color: 'var(--text-muted)' }}>{aiSuggestion.reason}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0' }}>{aiSuggestion.slot.name}</h4>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '15px' }}>
                                                <span><MapPin size={12} /> {aiSuggestion.slot.distance} km</span>
                                                <span style={{ color: 'var(--royal-gold)' }}>Bike: ₹{aiSuggestion.slot.bikePriceDynamic} | Car: ₹{aiSuggestion.slot.carPriceDynamic}/hr</span>
                                            </div>
                                        </div>
                                        <button className="btn-gold" style={{ padding: '8px 15px' }} onClick={() => navigate('/book', { state: { slot: aiSuggestion.slot } })}>Select</button>
                                    </div>
                                </motion.div>
                            )}

                            <h3 style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '8px' }}>Nearby Slots</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {slots.map(slot => (
                                    <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', background: 'var(--card-bg)', borderRadius: '12px', borderLeft: slot.available ? '4px solid #00f5d4' : '4px solid #f15bb5', transition: 'background 0.3s' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{slot.name}</h4>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {slot.distance} km</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Wallet size={14} /> Bike: ₹{slot.bikePriceDynamic}/hr | Car: ₹{slot.carPriceDynamic}/hr</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                            {slot.available ? (
                                                <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '14px', borderRadius: '6px' }} onClick={() => navigate('/book', { state: { slot } })}>Book</button>
                                            ) : (
                                                <span style={{ fontSize: '14px', color: 'var(--danger)', fontWeight: 'bold' }}>Occupied</span>
                                            )}
                                            <a href={`https://maps.google.com/?q=${slot.lat},${slot.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--royal-gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Navigation size={12} /> Navigate
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </motion.div>
                )}

                {activeTab === 'wallet' && (
                    <motion.div key="wallet" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                        <h2><Wallet size={24} style={{ verticalAlign: 'middle', marginRight: '10px', color: 'var(--royal-gold)' }} /> NETPark Digital Wallet</h2>
                        <div style={{ margin: '40px 0' }}>
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Available Balance</p>
                            <h1 style={{ fontSize: '48px', margin: '10px 0', color: 'var(--text-light)' }}>₹{balance}</h1>
                        </div>

                        <form onSubmit={handleAddMoney} style={{ background: 'rgba(0,0,0,0.3)', padding: '30px', borderRadius: '12px', textAlign: 'left' }}>
                            <h3 style={{ margin: '0 0 20px 0' }}>Add Money to Wallet</h3>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Amount (₹)</label>
                                <input type="number" required value={addMoneyAmount} onChange={e => setAddMoneyAmount(e.target.value)} placeholder="Enter amount to add" />
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Payment Source</label>
                                <select>
                                    <option>UPI ID</option>
                                    <option>Debit Card ending in 4421</option>
                                    <option>Net Banking</option>
                                </select>
                            </div>
                            <button className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '16px' }}>Proceed to Pay securely</button>
                        </form>
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h2><History size={24} style={{ verticalAlign: 'middle', marginRight: '10px', color: 'var(--royal-gold)' }} /> Booking History</h2>
                        
                        {history.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '20px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--card-bg)', color: 'var(--royal-gold)' }}>
                                        <th style={{ padding: '15px' }}>Location</th>
                                        <th style={{ padding: '15px' }}>Seat</th>
                                        <th style={{ padding: '15px' }}>Vehicle No.</th>
                                        <th style={{ padding: '15px' }}>Date</th>
                                        <th style={{ padding: '15px' }}>Time</th>
                                        <th style={{ padding: '15px' }}>Duration</th>
                                        <th style={{ padding: '15px' }}>Amount</th>
                                        <th style={{ padding: '15px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h, i) => {
                                        const endMs = new Date(`${h.date}T${h.time || '00:00'}:00`).getTime() + (h.duration * 60 * 1000);
                                        const isExpired = Date.now() > endMs;
                                        const minsRemaining = Math.max(0, Math.floor((endMs - Date.now()) / 60000));
                                        const displayStatus = isExpired ? 'Inactive' : h.status;

                                        return (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '15px' }}>{h.slotName}</td>
                                                <td style={{ padding: '15px' }}>{h.spaceId !== undefined ? (h.spaceId < 10 ? `C-${h.spaceId + 1}` : `B-${h.spaceId - 9}`) : 'N/A'}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{h.vehicleNumber || h.carNumber || 'N/A'}</div>
                                                    {h.carModel && <div style={{ fontSize: '11px', color: 'var(--royal-gold)', marginTop: '2px', fontWeight: 'bold' }}>Model: {h.carModel}</div>}
                                                </td>
                                                <td style={{ padding: '15px' }}>{h.date}</td>
                                                <td style={{ padding: '15px' }}>{h.time}</td>
                                                <td style={{ padding: '15px' }}>{h.duration} min(s)</td>
                                                <td style={{ padding: '15px' }}>₹{h.amount}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', background: displayStatus === 'Active' ? 'rgba(0, 245, 212, 0.2)' : 'rgba(255,255,255,0.1)', color: displayStatus === 'Active' ? '#00f5d4' : '#ccc', display: 'inline-block', width: 'fit-content' }}>
                                                            {displayStatus}
                                                        </span>
                                                        {displayStatus === 'Active' && (
                                                            <>
                                                                {minsRemaining <= 15 && <span style={{ fontSize: '10px', color: 'var(--danger)' }}>⚠️ {minsRemaining} mins left</span>}
                                                                <button onClick={() => { setExtendingBooking(h); setExtensionDuration(30); }} style={{ background: 'transparent', border: '1px solid var(--royal-gold)', color: 'var(--royal-gold)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', width: 'fit-content' }}>
                                                                    <Clock size={10} /> Extend
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#666', padding: '50px 0' }}>No previous bookings found.</p>
                        )}
                    </motion.div>
                )}

                {activeTab === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h2 style={{ marginBottom: '30px' }}><User size={24} style={{ verticalAlign: 'middle', marginRight: '10px', color: 'var(--royal-gold)' }} /> User Profile</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--royal-purple)' }}>
                                <label style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</label>
                                <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>{user.name || 'Anonymous Session'}</p>
                            </div>
                            
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--royal-purple)' }}>
                                <label style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Email Address</label>
                                <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>{user.email || 'Not Provided'}</p>
                            </div>
                            
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--royal-purple)' }}>
                                <label style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Phone Number</label>
                                <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>{user.phone || 'Not Provided'}</p>
                            </div>
                        </div>

                        <button className="btn-primary" style={{ width: '100%', padding: '15px', marginTop: '30px', fontSize: '16px' }} onClick={handleOpenEditProfile}>Edit Profile Information</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* UPI Payment Modal */}
            <AnimatePresence>
                {showUPIModal !== false && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--bg-dark)', padding: '30px', borderRadius: '16px', border: '2px solid #00f5d4', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
                            <h2 style={{ color: 'var(--success)', margin: '0 0 10px 0' }}>NETPark Secure UPI Gateway</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>Amount to Pay: <strong style={{ color: 'var(--royal-gold)', fontSize: '20px' }}>₹{showUPIModal}</strong></p>
                            
                            <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'inline-block', marginBottom: '25px' }}>
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=karerkarthik@okaxis&pn=Karthik%20Karer&cu=INR&am=${showUPIModal}.00`} alt="UPI QR" style={{ width: '150px', height: '150px' }} />
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Scan QR Code or open your preferred UPI app directly:</p>

                            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', marginBottom: '15px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                    <a href={`phonepe://pay?pa=karerkarthik@okaxis&pn=Karthik%20Karer&mu=netpark&tr=NP-${Date.now()}&cu=INR&am=${showUPIModal}.00`} 
                                       onClick={() => setIsWaitingForAppReturn(true)}
                                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#5f259f', color: 'var(--text-light)', textDecoration: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
                                        PhonePe
                                    </a>
                                    <a href={`gpay://upi/pay?pa=karerkarthik@okaxis&pn=Karthik%20Karer&cu=INR&am=${showUPIModal}.00`} 
                                       onClick={() => setIsWaitingForAppReturn(true)}
                                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#4285F4', textDecoration: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #4285F4' }}>
                                        Google Pay
                                    </a>
                                </div>
                                
                                <p style={{ fontSize: '12px', color: 'var(--royal-gold)', margin: 0 }}>* For security, please keep your 12-digit UPI Reference Number handy after paying to verify your booking natively.</p>

                                <button style={{ padding: '12px', background: 'transparent', border: '1px solid #555', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' }} onClick={() => setShowUPIModal(false)}>
                                    Cancel Transaction
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Extension Modal */}
            <AnimatePresence>
                {extendingBooking && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--bg-dark)', padding: '30px', borderRadius: '16px', border: '2px solid var(--royal-purple)', maxWidth: '400px', width: '90%' }}>
                            <h2 style={{ color: 'var(--royal-gold)', margin: '0 0 15px 0' }}>Extend Booking</h2>
                            <p style={{ margin: '0 0 15px 0', fontSize: '15px' }}><strong>{extendingBooking.slotName}</strong> (Space: {extendingBooking.spaceId < 10 ? `C-${extendingBooking.spaceId+1}` : `B-${extendingBooking.spaceId-9}`})</p>
                            
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Add Duration (Mins)</label>
                                <input 
                                    type="number" min="30" step="30" 
                                    value={extensionDuration} 
                                    onChange={e => setExtensionDuration(parseInt(e.target.value) || 30)}
                                    style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #444', background: '#000', color: 'var(--text-light)' }}
                                />
                            </div>

                            {extensionConflict && extensionConflict.type === 'hard' && (
                                <div style={{ background: 'var(--danger-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--danger)', marginBottom: '20px' }}>
                                    <p style={{ color: 'var(--danger)', margin: '0 0 10px 0', fontSize: '14px' }}>
                                        ❌ Extension not possible. Slot is already reserved from {extensionConflict.conflictTime}.
                                    </p>
                                    {extensionConflict.altSpace !== null ? (
                                        <div style={{ marginTop: '10px', fontSize: '13px' }}>
                                            <p style={{ color: 'var(--success)', margin: '0 0 10px 0' }}>💡 Alternative space <strong>{extensionConflict.altSpace < 10 ? `C-${extensionConflict.altSpace+1}` : `B-${extensionConflict.altSpace-9}`}</strong> is available for this time.</p>
                                            <button className="btn-primary" style={{ padding: '8px 15px', width: '100%', borderRadius: '6px' }} onClick={handleBookAlternative}>
                                                Move & Book Alternative
                                            </button>
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>No alternative spaces available in this branch.</p>
                                    )}
                                </div>
                            )}

                            {extensionConflict && extensionConflict.type === 'partial' && (
                                <div style={{ background: 'var(--primary-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--royal-gold)', marginBottom: '20px' }}>
                                    <p style={{ color: 'var(--royal-gold)', margin: '0 0 10px 0', fontSize: '14px' }}>
                                        ⚠️ Next booking starts at {extensionConflict.conflictTime}.
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '13px' }}>
                                        You can only extend for up to <strong>{extensionConflict.availableMins} mins</strong>.
                                    </p>
                                    <button className="btn-gold" style={{ padding: '8px 15px', width: '100%', borderRadius: '6px' }} onClick={() => setExtensionDuration(extensionConflict.availableMins)}>
                                        Change to {extensionConflict.availableMins} mins
                                    </button>
                                </div>
                            )}

                            {!extensionConflict && (
                                <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0, 245, 212, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 245, 212, 0.3)' }}>
                                    <p style={{ color: 'var(--success)', margin: '0 0 10px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <CheckCircle2 size={16} /> Slot is available for extension.
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Additional Cost</span>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--royal-gold)' }}>
                                            ₹{Math.ceil((extendingBooking.amount / extendingBooking.duration) * extensionDuration)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #555', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setExtendingBooking(null)}>Cancel</button>
                                {!extensionConflict && (
                                    <button style={{ flex: 1, padding: '12px', background: 'var(--royal-gold)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleConfirmExtension}>Confirm</button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Profile Modal */}
            <AnimatePresence>
                {showEditProfileModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--bg-dark)', padding: '30px', borderRadius: '16px', border: '2px solid var(--royal-purple)', maxWidth: '450px', width: '90%', boxShadow: '0 0 30px rgba(114, 9, 183, 0.25)' }}>
                            <h2 style={{ color: 'var(--royal-gold)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><User size={24} style={{ color: 'var(--royal-gold)' }} /> Update Secure Profile</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 20px 0' }}>Revise your gateway identity details and secure access keys.</p>

                            {editProfileError && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#fca5a5', padding: '10px', borderRadius: '4px', marginBottom: '20px', fontSize: '14px' }}>
                                    {editProfileError}
                                </div>
                            )}

                            <form onSubmit={handleEditProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Full Name</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={editProfileName} 
                                        onChange={e => setEditProfileName(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: 'var(--text-light)', fontSize: '15px' }}
                                    />
                                </div>

                                <div>
                                     <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Phone Number</label>
                                     <input 
                                         type="tel" 
                                         required 
                                         maxLength={10}
                                         value={editProfilePhone} 
                                         onChange={e => setEditProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                         style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: 'var(--text-light)', fontSize: '15px' }}
                                     />
                                 </div>

                                <div style={{ height: '1px', background: 'var(--card-bg)', margin: '10px 0' }} />

                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>New Password</label>
                                    <input 
                                        type="password" 
                                        placeholder="Leave blank to keep current password"
                                        value={editProfilePassword} 
                                        onChange={e => setEditProfilePassword(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: 'var(--text-light)', fontSize: '15px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        placeholder="Confirm new password"
                                        value={editProfileConfirmPassword} 
                                        onChange={e => setEditProfileConfirmPassword(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: 'var(--text-light)', fontSize: '15px' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button 
                                        type="button" 
                                        disabled={editProfileLoading}
                                        style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #555', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} 
                                        onClick={() => setShowEditProfileModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={editProfileLoading}
                                        style={{ flex: 1, padding: '12px', background: 'var(--royal-gold)', border: 'none', color: '#000', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {editProfileLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

