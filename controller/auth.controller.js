import userModel from "../models/user.model.js";
import jwt from 'jsonwebtoken'

const genrerateToken = (userId) => {
  return jwt.sign({id: userId}, process.env.JWT_SECRET, {
    expiresIn: '7d'
  }) 
}


const oauthCallback = async(req, res) => {
  try {
    const user = req.user;

    const token = genrerateToken(user._id)

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}-&user=${encodeURIComponent(JSON.stringify({
      id: user._id,
      email: user.email,
      name:user.profile.name,
      avatar: user.profile.avatar,
      oauthProvider:user.oauthProvider
  }))}`)
  }catch(err) {
    console.error("oauth callback error", err)
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`)
  }
}

const getme = async (req, res) => {
  try{
    const user = await userModel.findById(req.user._id).select('-password')
    res.json({
      user:{
        id:user_id,
        email: user.email,
        name: user.profile.name,
        avatar: user.profile.avatar,
        targetRole: user.profile.targetRole,
        experienceLevel: user.profile.experienceLevel,
        oauthProvider: user.oauthProvider,
        isEmailVarified:user.isEmailvarified
      }
    })

  }catch(err){
    res.status(500).json({message: "Error Fetching users"})
  }
}

const protect = async(req, res, next) => {
  try {
    let token;
    if(req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split('')[1]
    }

    if(!token) {
      return res.status(401).json({message: "User not authorized"})
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await userModel.findById(decoded.id).select('-password')

    if(!req.user) {
      return res.status(401).json({message: "User not found "})
    }

    next()

  } catch(err) {
    res.status(401).json({message: "No authorized User"})
  }
}

export {oauthCallback,getme, protect }
























