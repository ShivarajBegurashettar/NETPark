import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer')) {
        try {
            token = token.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
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
