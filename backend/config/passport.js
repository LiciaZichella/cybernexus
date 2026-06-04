const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User           = require('../models/User');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5005';

async function handleOAuthUser(provider, profileId, email, displayName) {
  let user = await User.findOne({ oauthProvider: provider, oauthId: profileId });
  if (user) return user;

  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user.oauthProvider = provider;
      user.oauthId       = profileId;
      await user.save({ validateModifiedOnly: true });
      return user;
    }
  }

  const base     = (displayName || email || 'user').replace(/\s+/g, '').slice(0, 20);
  let username   = base;
  let suffix     = 1;
  while (await User.findOne({ username })) {
    username = `${base}${suffix++}`;
  }

  user = await User.create({
    username,
    email: email || `${profileId}@${provider}.oauth`,
    oauthProvider: provider,
    oauthId: profileId,
  });
  return user;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${BACKEND_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const user  = await handleOAuthUser('google', profile.id, email, profile.displayName);
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  ));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy(
    {
      clientID:     process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:  `${BACKEND_URL}/api/auth/github/callback`,
      scope: ['user:email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const user  = await handleOAuthUser('github', profile.id, email, profile.displayName || profile.username);
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  ));
}

module.exports = passport;
