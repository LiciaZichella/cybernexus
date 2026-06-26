const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy; //prendo solo classe  Strategy
const GitHubStrategy = require('passport-github2').Strategy;
const User           = require('../models/User');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5005';

async function handleOAuthUser(provider, profileId, email, displayName) {
  let user = await User.findOne({ oauthProvider: provider, oauthId: profileId }); //gia collegato
  if (user) return user;

  if (email) {    //utente esiste con stessa mail e la collega a google
    user = await User.findOne({ email });
    if (user) {
      user.oauthProvider = provider;
      user.oauthId       = profileId;
      await user.save({ validateModifiedOnly: true });
      return user;
    }
  }

  const base     = (displayName || email || 'user').replace(/\s+/g, '').slice(0, 20); //utente totalmente nuovo
  let username   = base;
  let suffix     = 1;
  while (await User.findOne({ username })) {
    username = `${base}${suffix++}`;   //aggiunge suffissi se esiste gia un utente con quel nome
  }

  user = await User.create({
    username,
    email: email || `${profileId}@${provider}.oauth`, //di solito github non condivide la mail si crea un segnaposto
    oauthProvider: provider,
    oauthId: profileId,
  });
  return user;
}
//if esterno = solo se esistono le credenziali nell'abiente , funziona anche in locale
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
