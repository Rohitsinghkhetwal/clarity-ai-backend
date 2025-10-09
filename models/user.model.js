import mongoose from "mongoose"
import bcrypt from "bcryptjs"


const userSchema = new mongoose.Schema({
  email:{
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 6,
    required: function () {
      return !this.oauthProvider;
    }
  },
  profile: {
    name: String,
    avatar: String,
    targetRole: String,
    experienceLevel: {
      type: String,
      enum: ['entry', 'medium', 'senior'],
      default: 'entry'
    }
  },
  oauthProvider: {
    type: String,
    enum:['google', 'github'],
    default: null
  },
  oauthId: {
    type: String,
    sparse: true,
    unique: true
  },
  oauthProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isEmailvarified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
    default:Date.now()
  }
})

userSchema.pre('save', async function(next) {
  if(!this.isModified('password ')) return next();
  if(!this.password) return next()

  this.password = await bcrypt.hash(this.password, 12)
  next();
})

// compare password methods here

userSchema.methods.comparePassword = async function(candidatePassword) {
  if(!this.password) return false
  return await bcrypt.compare(candidatePassword, this.password)
}


//update last login 

userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return this.save()
}


const userModel = mongoose.model('users',userSchema )
export default userModel