import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Bike, Calendar, CheckCircle2, XCircle, Clock, CreditCard, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return '/api';
    }
    return 'http://localhost:5000/api';
};

const api = axios.create({ baseURL: getBaseURL() });

export default function TicketBooking() {
    const location = useLocation();
    const navigate = useNavigate();
    const slot = location.state?.slot;

    const [user, setUser] = useState({});
    const [balance, setBalance] = useState(0);
    const [globalLocks, setGlobalLocks] = useState([]);
    
    // Always calculate exactly current date and time on mount in local timezone
    const [bookingDetails, setBookingDetails] = useState(() => {
        const now = new Date();
        const coeff = 1000 * 60 * 5;
        const roundedNow = new Date(Math.ceil(now.getTime() / coeff) * coeff);
        const offset = roundedNow.getTimezoneOffset() * 60000;
        const localISOTime = new Date(roundedNow.getTime() - offset).toISOString().slice(0, -1);
        
        const dateStr = localISOTime.split('T')[0];
        const timeStr = localISOTime.split('T')[1].slice(0, 5);
        return { date: dateStr, time: timeStr, duration: 60, vehicleNumber: '', carModel: '', paymentMethod: 'Wallet' };
    });
    
    const getLocalDateStr = (d = new Date()) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [showUPIModal, setShowUPIModal] = useState(false);
    const [isWaitingForAppReturn, setIsWaitingForAppReturn] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    useEffect(() => {
        if (!slot) {
            navigate('/dashboard');
            return;
        }
        const localUser = JSON.parse(localStorage.getItem('user'));
        if (!localUser) {
            navigate('/login');
        } else {
            setUser(localUser);
            setBalance(localUser.walletBalance || 500);
        }

        const fetchLocks = async () => {
            try {
                const res = await api.get('/auth/active-locks');
                setGlobalLocks(res.data);
            } catch (e) {
                console.error("Lock sync failed");
            }
        };
        fetchLocks();
        const lockInterval = setInterval(fetchLocks, 3000);
        return () => clearInterval(lockInterval);
    }, [navigate, slot]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && isWaitingForAppReturn && showUPIModal !== false) {
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

    const finalizeBooking = async (totalAmount) => {
        try {
            await api.post('/auth/send-booking-receipt', {
                email: user?.email,
                name: user?.name,
                slotName: slot.name,
                duration: bookingDetails.duration,
                amount: totalAmount,
                lat: slot.lat,
                lng: slot.lng,
                branchId: slot.id,
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
        
        let newBalance = balance;
        if (bookingDetails.paymentMethod === 'Wallet') {
            newBalance -= totalAmount;
            const updatedUser = {...user, walletBalance: newBalance};
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        const newBooking = {
            id: Date.now(),
            slotName: slot.name,
            branchId: slot.id,
            spaceId: selectedSpace,
            date: bookingDetails.date,
            time: bookingDetails.time,
            duration: bookingDetails.duration,
            amount: totalAmount,
            status: 'Active',
            vehicleNumber: bookingDetails.vehicleNumber,
            carModel: bookingDetails.carModel
        };

        const existingHistory = JSON.parse(localStorage.getItem(`NETPark_BookingHistory_${user?.email}`)) || [];
        const newHistory = [newBooking, ...existingHistory];
        localStorage.setItem(`NETPark_BookingHistory_${user?.email}`, JSON.stringify(newHistory));

        setShowUPIModal(false);
        navigate('/dashboard', { state: { activeTab: 'history', toastMessage: `Success! Set reservation at ${slot.name} via ${bookingDetails.paymentMethod}. Live tracking receipt and GPS directions sent to your email!` } });
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

        const carSp = slot.carSpaces || 10;
        const isCar = selectedSpace < carSp;
        const baseRate = isCar ? slot.carPriceDynamic : slot.bikePriceDynamic;
        const total = Math.ceil(baseRate * (bookingDetails.duration / 60));

        const currentDate = getLocalDateStr();
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

    if (!slot) return null;

    const currentDate = getLocalDateStr();
    const maxDate = getLocalDateStr(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));

    return (
        <div style={{ minHeight: '100vh', padding: '30px', background: 'var(--bg-dark)' }}>
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
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: 'var(--royal-gold)', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                <div className="card">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Calendar size={22} />Ticket Booking Details</h2>
                    
                    <div style={{ background: 'linear-gradient(to right, rgba(10, 17, 40, 0.9), rgba(58, 12, 163, 0.2))', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid rgba(255, 183, 3, 0.3)' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: 'var(--royal-gold)', fontSize: '20px' }}>{slot.name}</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Distance</span>
                            <span>{slot.distance}km</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Forecasted Demand</span>
                            <span style={{ color: slot.aiContext?.surgeMultiplier >= 1.6 ? '#f15bb5' : slot.aiContext?.surgeMultiplier < 1 ? '#00f5d4' : '#fff' }}>
                                {slot.aiContext?.demandLevel || 'Normal'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>AI Availability Prediction</span>
                            <span style={{ color: 'var(--text-muted)' }}>{slot.aiContext?.availabilityPrediction}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Dynamic Rate</span>
                            <span style={{ color: 'var(--success)' }}>
                                Bike: ₹{slot.bikePriceDynamic}/hr | Car: ₹{slot.carPriceDynamic}/hr 
                                {slot.aiContext?.surgeMultiplier && slot.aiContext.surgeMultiplier !== 1.0 && ` (${slot.aiContext.surgeMultiplier}x Surge)`}
                            </span>
                        </div>
                    </div>

                    {/* Select a Parking Space Grid */}
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-light)' }}>Select Parking Space</h4>
                        <div style={{ background: 'var(--input-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
                                {Array.from({ length: (slot.carSpaces || 10) + (slot.bikeSpaces || 5) }).map((_, i) => {
                                    const carSp = slot.carSpaces || 10;
                                    const isCar = i < carSp;
                                    const label = isCar ? `C-${i + 1}` : `B-${i - carSp + 1}`;
                                    const IconIcon = isCar ? Car : Bike;
                                    const targetStartMs = new Date(`${bookingDetails.date}T${bookingDetails.time}:00`).getTime();
                                    const targetEndMs = targetStartMs + (bookingDetails.duration * 60 * 1000);
                                    
                                    const isOccupied = globalLocks.some(l => {
                                        if (l.branchId !== slot.id || l.spaceId !== i) return false;
                                        return (targetStartMs >= l.startMs && targetStartMs < l.endMs) || 
                                               (targetEndMs > l.startMs && targetEndMs <= l.endMs) ||
                                               (targetStartMs <= l.startMs && targetEndMs >= l.endMs);
                                    });
                                    const isSelected = selectedSpace === i;
                                    return (
                                        <motion.div
                                            key={i}
                                            whileHover={!isOccupied ? { scale: 1.1 } : {}}
                                            whileTap={!isOccupied ? { scale: 0.95 } : {}}
                                            onClick={() => !isOccupied && setSelectedSpace(i)}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                padding: '10px 10px',
                                                background: isOccupied ? 'rgba(255,255,255,0.05)' : isSelected ? 'rgba(0, 245, 212, 0.2)' : 'rgba(10, 17, 40, 0.8)',
                                                border: isSelected ? '2px solid #00f5d4' : isOccupied ? '2px solid transparent' : '2px solid var(--royal-purple)',
                                                borderRadius: '8px', cursor: isOccupied ? 'not-allowed' : 'pointer', opacity: isOccupied ? 0.6 : 1
                                            }}
                                        >
                                            <IconIcon color={isOccupied ? '#f15bb5' : isSelected ? '#00f5d4' : '#fff'} size={24} style={{ marginBottom: '5px' }} />
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: isOccupied ? '#f15bb5' : '#fff' }}>{label}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifySelf: 'center', marginTop: '15px', gap: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: 'rgba(10, 17, 40, 0.8)', border: '2px solid var(--royal-purple)', borderRadius: '3px' }}/> Available</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: 'var(--success-bg)', border: '2px solid #00f5d4', borderRadius: '3px' }}/> Selected</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', background: 'var(--card-bg)', borderRadius: '3px' }}/> Occupied</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Date</label>
                            <input type="date" value={bookingDetails.date} min={currentDate} max={maxDate} onChange={(e) => setBookingDetails({ ...bookingDetails, date: e.target.value })} style={{ marginTop: '5px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-light)', padding: '8px', borderRadius: '4px', border: '1px solid #444', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Time</label>
                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                <select 
                                    value={parseInt(bookingDetails.time.split(':')[0]) % 12 || 12}
                                    onChange={(e) => {
                                        let h = parseInt(e.target.value);
                                        const isPM = parseInt(bookingDetails.time.split(':')[0]) >= 12;
                                        if (isPM && h !== 12) h += 12;
                                        if (!isPM && h === 12) h = 0;
                                        setBookingDetails({ ...bookingDetails, time: `${h.toString().padStart(2, '0')}:${bookingDetails.time.split(':')[1]}` });
                                    }}
                                    style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-light)', padding: '8px', borderRadius: '4px', border: '1px solid #444', flex: 1, minWidth: 0 }}
                                >
                                    {[...Array(12).keys()].map(i => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                                <select 
                                    value={bookingDetails.time.split(':')[1]}
                                    onChange={(e) => setBookingDetails({ ...bookingDetails, time: `${bookingDetails.time.split(':')[0]}:${e.target.value}` })}
                                    style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-light)', padding: '8px', borderRadius: '4px', border: '1px solid #444', flex: 1, minWidth: 0 }}
                                >
                                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select 
                                    value={parseInt(bookingDetails.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}
                                    onChange={(e) => {
                                        let h = parseInt(bookingDetails.time.split(':')[0]);
                                        const isPM = e.target.value === 'PM';
                                        if (isPM && h < 12) h += 12;
                                        if (!isPM && h >= 12) h -= 12;
                                        setBookingDetails({ ...bookingDetails, time: `${h.toString().padStart(2, '0')}:${bookingDetails.time.split(':')[1]}` });
                                    }}
                                    style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-light)', padding: '8px', borderRadius: '4px', border: '1px solid #444', flex: 1, minWidth: 0 }}
                                >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={14} /> Duration (Mins)</label>
                            <input
                                type="number" min="60" step="30" value={bookingDetails.duration}
                                onChange={(e) => setBookingDetails({ ...bookingDetails, duration: parseInt(e.target.value) || 60 })}
                                style={{ marginTop: '5px' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}><Car size={14} /> Vehicle Number</label>
                            <input
                                type="text" placeholder="e.g. KA 25 AB 1234" value={bookingDetails.vehicleNumber}
                                onChange={(e) => setBookingDetails({ ...bookingDetails, vehicleNumber: e.target.value })}
                                style={{ marginTop: '5px', width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-light)' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}><Car size={14} /> Car Model</label>
                        <input
                            type="text" placeholder="e.g. Innova, Swift" value={bookingDetails.carModel}
                            onChange={(e) => setBookingDetails({ ...bookingDetails, carModel: e.target.value })}
                            style={{ marginTop: '5px', width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-light)', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}><CreditCard size={14} /> Payment Method</label>
                        <select
                            value={bookingDetails.paymentMethod}
                            onChange={(e) => setBookingDetails({ ...bookingDetails, paymentMethod: e.target.value })}
                            style={{ marginTop: '5px', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-light)', width: '100%' }}
                        >
                            <option value="Wallet">NETPark Wallet (₹{balance})</option>
                            <option value="UPI">UPI (Google Pay / PhonePe)</option>
                            <option value="Card">Credit/Debit Card</option>
                            {bookingDetails.date === getLocalDateStr() && <option value="Pay at Counter">Pay at Counter (Cash in Hand)</option>}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--input-bg)', padding: '20px', borderRadius: '12px', marginBottom: '25px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Total Amount</span>
                        <span style={{ fontSize: '28px', fontWeight: '900', color: 'var(--royal-gold)' }}>
                            ₹{selectedSpace !== null ? Math.ceil((selectedSpace < (slot.carSpaces || 10) ? slot.carPriceDynamic : slot.bikePriceDynamic) * (bookingDetails.duration / 60)) : 0}
                        </span>
                    </div>

                    <button className="btn-gold" style={{ width: '100%', fontSize: '18px', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} onClick={handleBook}>
                        <CheckCircle2 size={22} /> Confirm Secure Booking
                    </button>
                </div>
            </div>

            {/* UPI Modal */}
            <AnimatePresence>
                {showUPIModal !== false && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: 'var(--bg-dark)', padding: '30px', borderRadius: '16px', border: '2px solid #00f5d4', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
                            <h2 style={{ color: 'var(--success)', margin: '0 0 10px 0' }}>NETPark Secure UPI Gateway</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>Amount to Pay: <strong style={{ color: 'var(--royal-gold)', fontSize: '20px' }}>₹{showUPIModal}</strong></p>
                            
                            <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'inline-block', marginBottom: '25px' }}>
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=karerkarthik@okaxis&pn=Karthik%20Karer&cu=INR&am=${showUPIModal}.00`} alt="UPI QR" style={{ width: '150px', height: '150px' }} />
                            </div>

                            <button style={{ padding: '12px', background: 'transparent', border: '1px solid #555', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' }} onClick={() => setShowUPIModal(false)}>
                                Cancel Transaction
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
