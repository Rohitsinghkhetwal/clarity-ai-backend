import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import userModel from '../models/user.model.js';
import dotenv from "dotenv"

dotenv.config({
  path: './config.env'
})

//serialize user

// console.log("✅ INSIDE THE PASSPORT ",process.env.OAUTH_CLIENTID,process.env.OAUTH_SECRET,process.env.BACKEND_URL)

passport.serializeUser((user, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.OAUTH_CLIENTID,
      clientSecret: process.env.OAUTH_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      passReqToCallback: false,
      proxy: true
    },
    async (accesstoken, refreshToken, profile, done) => {
      console.log("✅ INSIDE THE PASSPORT CALLBACK ")
      try {
        let user = await userModel.findOne({
          $or: [
            { oauthId: profile.id, oauthProvider: "google" },
            { email: profile.emails[0].value },
          ],
        });

        if (user) {
          if (!user.oauthProvider) {
            user.oauthProvider = "google";
            user.oauthId = profile.id;
            user.isEmailvarified = true;
          }
          user.profile.name = user.profile.name || profile.displayName;
          user.profile.avatar = user.profile.avatar || profile.photos[0]?.value;
          user.oauthProfile = profile._json;
          user.lastLogin = new Date();

          await user.save();
        } else {
          user = await userModel.create({
            email: profile.emails[0].value,
            profile: {
              name: profile.displayName,
              avatar: profile.photos[0]?.value,
            },
            oauthProvider: "google",
            oauthId: profile.id,
            oauthProfile: profile._json,
            isEmailvarified: true,
            lastLogin: new Date(),
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENTID,
      clientSecret: process.env.GITHUB_SECRETID,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/github/callback`,
      scope: ["user:email"],
    },
    async (accesstoken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0]
            ? profile.emails[0].value
            : `${profile.username}@github.placeholder.com`;

        let user = await userModel.findOne({
          $or: [
            { oauthId: profile.id, oauthProvider: "github" },
            { email: email },
          ],
        });

        if (user) {
          if (!user.oauthProvider) {
            user.oauthProvider = "github";
            user.oauthId = profile.id;
            user.isEmailvarified = true;
          }

          user.profile.name =
            user.profile.name || profile.displayName || profile.username;
          user.profile.avatar = user.profile.avatar || profile.photos[0]?.name;
          user.oauthProfile = profile._json;
          user.lastLogin = new Date();
          await user.save();
        } else {
          user = await userModel.create({
            email: email,
            profile: {
              name: profile.displayName || profile.username,
              avatar: profile.photos[0]?.value,
            },
            oauthProvider: "github",
            oauthId: profile.id,
            oauthProfile: profile._json,
            isEmailvarified: true,
            lastLogin: new Date(),
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport
