const mongoose = require('mongoose');
const User = require('../models/users');

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Name, email, and password are all required' });
  }

  const user = new User();
  user.name = name;
  user.email = email;
  user.role = 'user'; 
  user.setPassword(password);

  try {
    await user.save();
    const token = user.generateJWT();
    return res.status(201).json({ token });
  } catch (err) {
    return res
      .status(400)
      .json({ message: 'Error registering user', error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.validPassword(password)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = user.generateJWT();
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { register, login };