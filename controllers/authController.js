const User = require("../models/User");
const jwt = require('jsonwebtoken');

const handleErrors = (err) => {
  let errors = { email: '', password: '' };

  if (err.message === 'incorrect email') {
    errors.email = 'That email is not registered';
  }

  if (err.message === 'incorrect password') {
    errors.password = 'That password is incorrect';
  }

  if (err.code === 11000) {
    errors.email = 'That email is already registered';
    return errors;
  }

  if (err.message.includes('user validation failed')) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
};

const maxAge = 3 * 24 * 60 * 60; // 3 days
const createToken = (id, role) => {
  return jwt.sign({ id, role }, 'PranshuOnlineJudge', {
    expiresIn: maxAge
  });
};

module.exports.signup_get = (req, res) => {
  res.render('signup');
};

module.exports.login_get = (req, res) => {
  res.render('login');
};

module.exports.signup_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.create({ email, password });
    const token = createToken(user._id, user.role);

    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: maxAge * 1000,
      sameSite: 'Lax',
      secure: false // Set to true if using HTTPS
    });

    res.status(201).json({
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id, user.role);

    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: maxAge * 1000,
      sameSite: 'Lax',
      secure: false // Set to true if using HTTPS
    });

    res.status(200).json({
      user: {
        _id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = (req, res) => {
  res.cookie("jwt", "", {
    maxAge: 1,
    httpOnly: true,
    sameSite: 'Lax',
    secure: false
  });
  res.json({ message: "Logged out successfully" });
};

// ✅ Return current logged-in user (for frontend /me check)
module.exports.me_get = (req, res) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(200).json({ user: null });

  try {
    const decoded = jwt.verify(token, 'PranshuOnlineJudge');
    User.findById(decoded.id).select('-password').then(user => {
      if (!user) return res.status(200).json({ user: null });
      res.status(200).json({ user });
    });
  } catch (err) {
    console.error("❌ Error decoding token:", err);
    res.status(200).json({ user: null });
  }
};
