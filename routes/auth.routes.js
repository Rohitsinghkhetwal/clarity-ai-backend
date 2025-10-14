import express from 'express';
import passport from 'passport';
import { oauthCallback, getMe, protect, logout } from "../controller/auth.controller.js"

const router = express.Router();

// Google OAuth Routes
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/signup?error=auth_failed`,
    session: false 
  }),
  oauthCallback
);

router.get(
  '/github',
  passport.authenticate('github', { 
    scope: ['user:email'] 
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { 
    failureRedirect: `${process.env.FRONTEND_URL}/signup?error=auth_failed`,
    session: false
  }),
  oauthCallback
);

// Protected Routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;