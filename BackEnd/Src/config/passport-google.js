import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserDBContext from '../dal/UserDBContext.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const userDB = new UserDBContext();

// Function to generate random password
const generateSecurePassword = () => {
    return crypto.randomBytes(32).toString('hex');
};

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await userDB.getUserByEmail(profile.emails[0].value);
        
        if (!user) {
            // Generate a secure random password for Google users
            const securePassword = generateSecurePassword();
            
            const newUser = {
                Username: profile.emails[0].value.split('@')[0],
                Email: profile.emails[0].value,
                Fullname: profile.displayName,
                Password: securePassword, // Add secure random password
                Status: true,
                PhoneNumber: '', // Add empty phone number
                Image: null // Add null image
            };
            
            const userId = await userDB.insert(newUser);
            user = await userDB.get(userId);
        }
        
        return done(null, user);
    } catch (error) {
        console.error('Google auth error:', error);
        return done(error, null);
    }
}));

// Required for maintaining login session
passport.serializeUser((user, done) => {
    done(null, user.UserID);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userDB.get(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;