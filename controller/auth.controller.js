import userModel from "../models/user.model.js";
import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};


const oauthCallback = async (req, res) => {

  console.log("Oauth callback controller ")
  console.log("use from passprt")
  try {
    const user = req.user;
    
    if (!user) {
      console.log("✅ No User")
      return res.redirect(`${process.env.FRONTEND_URL}/signup?error=auth_failed`);
    }

    const token = generateToken(user._id);

    const userData = {
      id: user._id,
      email: user.email,
      name: user.profile.name,
      avatar: user.profile.avatar,
      oauthProvider: user.oauthProvider
    };

  
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify(userData)
      )}`
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${process.env.FRONTEND_URL}/signup?error=auth_failed`);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.profile.name,
        avatar: user.profile.avatar,
        targetRole: user.profile.targetRole,
        experienceLevel: user.profile.experienceLevel,
        oauthProvider: user.oauthProvider,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Error fetching user" });
  }
};

// Protect Middleware
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]; // Fixed: was split('')[1]
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

  
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = await userModel.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

const logout = async (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
};

export { oauthCallback, getMe, protect, logout };