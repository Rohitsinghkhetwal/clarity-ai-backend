import express from "express"
import passportRoutes from "../config/passport.js"
const router = express.Router()

router.get('/google', passportRoutes.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}))

router.get('/google/callback', passportRoutes.authenticate('google', {session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed}`}),
// you have to add callback function here

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
  authController.oauthCallback
);