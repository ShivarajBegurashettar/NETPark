import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer')) {
        try {
            const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev_insecure_jwt_secret' : null);
            if (!secret) throw new Error('JWT_SECRET configuration missing');
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            next();
        } catch (error) {
            console.error(`[AUTH ERROR] Token verification failed: ${error.message}`);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    } else {
        console.error(`[AUTH ERROR] No valid Bearer token in headers: ${token}`);
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.error(`[AUTH ERROR] User is not authorized as admin: role = ${req.user?.role}`);
        res.status(403).json({ error: 'Not authorized as an admin' });
    }
};
