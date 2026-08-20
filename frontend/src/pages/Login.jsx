import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LockKeyhole, Mail, User, Phone, ShieldCheck, CheckCircle2, KeyRound, Eye, EyeOff, BarChart2, Wallet, Car } from 'lucide-react';
import api from '../api';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [step, setStep] = useState(1); // 1 = Entry Form, 2 = OTP Verification
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    const navigate = useNavigate();

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!isLogin) {
            if (password !== confirmPassword) {
                setErrorMsg('Passwords do not match.');
                return;
            }
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.length !== 10) {
                setErrorMsg('Phone number must be exactly 10 digits.');
                return;
            }
        }

        setLoading(true);
        try {
            // Verify credentials first for login attempts
            if (isLogin) {
                await api.post('/auth/login', { email, password });
            }
            
            // Send OTP securely through the Express Backend API
            await api.post('/auth/send-otp', { email });
            setSuccessMsg('OTP Code dispatched to your Email!');
            setStep(2); // Move to OTP Phase
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || 'Failed to trigger verification code.');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPVerify = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            // Note: Our backend endpoint automatically registers them if they don't exist yet, acting as a universal secure entry
            const res = await api.post('/auth/verify-otp-login', { email, otp, name, phone, password });
            
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            setSuccessMsg('Authentication Successful! Redirecting...');
            
            setTimeout(() => {
                if (res.data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            }, 1000);
            
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || 'Invalid OTP Code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-gradient-to-b from-[#0F172A] to-[#111827] relative font-sans overflow-hidden">
            
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

            {/* Main Content Area */}
            <div className="w-full flex items-center justify-center max-w-[1200px] mx-auto px-6 z-10 pt-24 lg:pt-0">
                
                {/* Login Card */}
                <div className="w-full max-w-[480px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="login-card"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="bg-[#FFFFFF] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] p-8 sm:p-12 w-full border border-[#E5E7EB]"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-[#111827] text-3xl font-bold mb-2">
                                    {step === 1 ? (isLogin ? 'Welcome Back' : 'Create Account') : 'Verification Required'}
                                </h2>
                                <p className="text-[#64748B] text-base">
                                    {step === 1 
                                        ? (isLogin ? 'Sign in to continue to your account' : 'Enter your details to register') 
                                        : `We've sent a 6-digit OTP to ${email}`}
                                </p>
                            </div>

                            {/* Alerts */}
                            <AnimatePresence>
                                {errorMsg && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#EF4444]/10 border-l-4 border-[#EF4444] text-[#EF4444] p-3 rounded-md mb-6 text-sm">
                                        {errorMsg}
                                    </motion.div>
                                )}
                                {successMsg && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-[#22C55E]/10 border-l-4 border-[#22C55E] text-[#22C55E] p-3 rounded-md mb-6 text-sm flex items-center gap-2">
                                        <CheckCircle2 size={16} /> {successMsg}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {step === 1 ? (
                                <motion.div key="step-1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <form onSubmit={handleInitialSubmit} className="space-y-5">
                                        {!isLogin && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Full Name</label>
                                                    <div className="relative">
                                                        <User className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                                        <input
                                                            type="text"
                                                            placeholder="John Doe"
                                                            required
                                                            value={name}
                                                            onChange={(e) => setName(e.target.value)}
                                                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-4 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Phone Number</label>
                                                    <div className="relative">
                                                        <Phone className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                                        <input
                                                            type="tel"
                                                            placeholder="10-digit mobile number"
                                                            required
                                                            maxLength={10}
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                            className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-4 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                                <input
                                                    type="email"
                                                    placeholder="example@gmail.com"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-4 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Password</label>
                                            <div className="relative">
                                                <LockKeyhole className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={isLogin ? "Enter your password" : "Create strong password"}
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-11 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-[#111827] transition-colors"
                                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {!isLogin && (
                                            <div>
                                                <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">Confirm Password</label>
                                                <div className="relative">
                                                    <LockKeyhole className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        placeholder="Confirm your password"
                                                        required
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[48px] pl-11 pr-11 text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-[#111827] transition-colors"
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {isLogin && (
                                            <div className="flex items-center justify-between mt-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-[#2563EB] bg-gray-100 border-gray-300 rounded focus:ring-[#2563EB] cursor-pointer" defaultChecked />
                                                    <span className="text-sm text-[#111827] font-medium">Remember me</span>
                                                </label>
                                                <button type="button" className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium">Forgot Password?</button>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full h-[48px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-[10px] transition-colors mt-2 disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                                        </button>

                                        {isLogin && (
                                            <>
                                                <div className="relative flex items-center py-4">
                                                    <div className="flex-grow border-t border-[#E5E7EB]"></div>
                                                    <span className="flex-shrink-0 mx-4 text-[#64748B] text-sm uppercase">OR</span>
                                                    <div className="flex-grow border-t border-[#E5E7EB]"></div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/admin-login')}
                                                    className="w-full h-[48px] bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#2563EB] font-medium rounded-[10px] transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <User size={18} />
                                                    Sign in with Admin Account
                                                </button>
                                            </>
                                        )}

                                        <div className="text-center mt-6 text-sm text-[#64748B]">
                                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                                            <button 
                                                type="button" 
                                                onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); setSuccessMsg(''); }} 
                                                className="text-[#2563EB] hover:text-[#1D4ED8] font-medium transition-colors"
                                            >
                                                {isLogin ? 'Sign Up' : 'Sign In'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <form onSubmit={handleOTPVerify} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-[#111827] mb-1.5 text-left">OTP Code</label>
                                            <div className="relative">
                                                <KeyRound className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="Enter 6-digit OTP"
                                                    required
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    className="w-full bg-white border border-[#E5E7EB] rounded-[10px] h-[52px] pl-12 pr-4 text-center text-xl tracking-[0.5em] text-[#111827] font-bold focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || otp.length < 5}
                                            className="w-full h-[48px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-[10px] transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Verifying...' : 'Authenticate & Enter'}
                                        </button>

                                        <div className="text-center">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="text-sm text-[#64748B] hover:text-[#111827] transition-colors font-medium"
                                            >
                                                ← Back to Login
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>


                
            </div>

            {/* Bottom Footer Text */}
            <div className="absolute bottom-8 w-full text-center text-[#64748B] text-sm z-10 font-medium">
                © {new Date().getFullYear()} NETPARK. All rights reserved.
            </div>

            {/* Optional Subtle Background Elements */}
            <div className="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-t from-[#0F172A]/50 to-transparent pointer-events-none z-0"></div>
            
        </div>
    );
}

