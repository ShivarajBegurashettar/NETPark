import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Key, ArrowRight, UserPlus, Eye, EyeOff, User, Phone, CheckCircle2, Car } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isSignup, setIsSignup] = useState(false);
    const [adminType, setAdminType] = useState('admin'); // 'admin' or 'master'
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [branchAddress, setBranchAddress] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        // Master Admin specific check if in Master Tab (Case-Insensitive)
        if (adminType === 'master' && email.toLowerCase() !== 'begurshatershivaraj@gmail.com') {
            setError('ACCESS_DENIED: Master Admin login restricted to primary security account.');
            return;
        }

        setLoading(true);
        try {
            // First verify credentials for login
            const normalizedEmail = email.toLowerCase();
            if (!isSignup) {
                await api.post('/auth/login', { email: normalizedEmail, password });
            }

            await api.post('/auth/send-otp', { email: normalizedEmail });
            setOtpSent(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const normalizedEmail = email.toLowerCase();
            const res = await api.post('/auth/verify-otp-login', { email: normalizedEmail, otp });
            const { token, user } = res.data;

            if (user.role !== 'admin') {
                setError('ACCESS_DENIED: These credentials do not have Administrative Clearance.');
                return;
            }

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.error || 'OTP Verification Failed');
        } finally {
            setLoading(false);
        }
    };

    const isStrongPassword = (pass) => {
        return pass.length >= 7 && /[a-zA-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        if (!isStrongPassword(password)) {
            setError('SECURITY_WEAKNESS: Password must be min 7 characters with alpha, numeric, and special characters.');
            return;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
            setError('Phone number must be exactly 10 digits.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/register', { name, email, phone, password, role: 'admin', branchAddress });
            alert(res.data.message);
            setIsSignup(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#0F172A] to-[#111827] relative font-sans overflow-hidden px-6">

            {/* Top Left Logo */}
            <div className="absolute top-8 left-8 md:top-10 md:left-12 flex flex-col z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#2563EB] rounded-md text-white flex items-center justify-center font-bold text-xl">
                        <Car size={20} />
                    </div>
                    <span className="text-white font-bold text-2xl tracking-wide">NETPARK</span>
                </div>
                <span className="text-[#64748B] text-sm mt-1">Smart Parking Management System</span>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FFFFFF] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-8 sm:p-12 w-full max-w-[480px] border border-[#E5E7EB] z-10"
            >
                <div className="text-center mb-8">
                    <div className={`w-16 h-16 rounded-[16px] flex items-center justify-center mx-auto mb-5 shadow-lg ${adminType === 'master' ? 'bg-[#0F172A] text-[#2563EB]' : 'bg-[#2563EB] text-white'}`}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-[#111827] text-3xl font-bold mb-2">NETPark Admin</h1>
                    <p className="text-[#64748B] text-base">Administrative Gateway & Registry Access</p>
                </div>

                {!otpSent && !isSignup && (
                    <div className="flex bg-[#F1F5F9] rounded-xl p-1 mb-8">
                        <button
                            type="button"
                            onClick={() => setAdminType('admin')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${adminType === 'admin' ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-[#111827]'}`}
                        >
                            Standard Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => { setAdminType('master'); setEmail('begurshatershivaraj@gmail.com'); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${adminType === 'master' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[#64748B] hover:text-[#111827]'}`}
                        >
                            Master Admin
                        </button>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {!otpSent ? (
                        <motion.form
                            key={isSignup ? 'signup' : 'login'}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={isSignup ? handleSignup : handleSendOTP}
                            className="space-y-5"
                        >
                            {isSignup && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-4 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="Admin Name" />
                                        </div>
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Phone Number</label>
                                         <div className="relative">
                                             <Phone className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                             <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} required className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-4 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="10-digit mobile number" />
                                         </div>
                                     </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Working Branch Address</label>
                                        <div className="relative">
                                            <ShieldCheck className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                            <input type="text" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} required className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-4 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="e.g. MG Road Branch" />
                                        </div>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-4 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="admin@netpark.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Secure Password</label>
                                <div className="relative">
                                    <Lock className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-11 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-[#111827] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-[#EF4444]/10 border-l-4 border-[#EF4444] text-[#EF4444] p-3 rounded-md text-sm mt-4">
                                    {error}
                                </motion.div>
                            )}

                            <button type="submit" disabled={loading} className={`w-full h-[48px] text-white font-medium rounded-[10px] transition-colors mt-6 disabled:opacity-50 flex items-center justify-center gap-2 ${adminType === 'master' ? 'bg-[#0F172A] hover:bg-[#1E293B]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'}`}>
                                {loading ? 'Securing Access...' : (isSignup ? 'Apply for Admin Access' : 'Authenticate & Send OTP')} <ArrowRight size={18} />
                            </button>

                            <button type="button" onClick={() => { setIsSignup(!isSignup); setError(''); }} className="w-full text-center mt-4 text-[#64748B] hover:text-[#111827] transition-colors text-sm font-medium">
                                {isSignup ? 'Already have access? Log in' : 'New Administrator? Request access'}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="otp"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onSubmit={handleVerifyAndLogin}
                            className="space-y-6"
                        >
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Key size={24} className="text-[#2563EB]" />
                                </div>
                                <h2 className="text-[#111827] text-2xl font-bold mb-2">Verify Identity</h2>
                                <p className="text-[#64748B] text-sm">Enter the 6-digit code sent to your email</p>
                            </div>

                            <div>
                                <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} required className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[56px] text-center text-2xl tracking-[0.5em] text-[#111827] font-bold focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors" placeholder="000000" />
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-[#EF4444]/10 border-l-4 border-[#EF4444] text-[#EF4444] p-3 rounded-md text-sm mt-4">
                                    {error}
                                </motion.div>
                            )}

                            <button type="submit" disabled={loading} className={`w-full h-[48px] text-white font-medium rounded-[10px] transition-colors mt-6 disabled:opacity-50 flex items-center justify-center ${adminType === 'master' ? 'bg-[#0F172A] hover:bg-[#1E293B]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'}`}>
                                {loading ? 'Verifying...' : 'Unlock Admin Dashboard'}
                            </button>

                            <button type="button" onClick={() => setOtpSent(false)} className="w-full text-center mt-4 text-[#64748B] hover:text-[#111827] transition-colors text-sm font-medium">
                                Incorrect email? Go back
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Bottom Footer Text */}
            <div className="absolute bottom-8 w-full text-center text-[#64748B] text-sm z-10 font-medium">
                © {new Date().getFullYear()} NETPARK ADMIN. All rights reserved.
            </div>

            {/* Optional Subtle Background Elements */}
            <div className="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-t from-[#0F172A]/50 to-transparent pointer-events-none z-0"></div>

        </div>
    );
};

export default AdminLogin;
