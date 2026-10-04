require('dotenv').config();
const mongoose = require('mongoose');
require('../models/db');

const User = mongoose.model('users');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();

  if (!email) throw new Error('Set ADMIN_EMAIL (and ADMIN_PASSWORD for a new account).');

  let user = await User.findOne({ email });
    if (user) {
    user.role = 'admin';
    if (password) {
      if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
      user.setPassword(password);
    }
    await user.save();
    console.log(`Existing user ${email} promoted to admin.`);
    return;
  }

  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  user = new User({ name, email, role: 'admin' });
  user.setPassword(password);
  await user.save();
  console.log(`Admin account created for ${email}.`);
}

main()
  .catch((err) => { console.error('create-admin failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.connection.close());