import express from "express"
import passport from "../config/passport.js"
import { oauthCallback , getme, protect } from "../controller/auth.controller.js"

const router = express.Router()

router.get('/me', protect, getme);

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}))

router.get('/google/callback', passport.authenticate('google', {session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed}`}),
// you have to add callback function here
oauthCallback

)

// git hub auth 
router.get('/github',
  passport.authenticate('github', { 
    scope: ['user:email'],
    session: false 
  })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  // authController.oauthCallback
  oauthCallback
);

export default router