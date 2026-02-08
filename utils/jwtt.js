import jwt from 'jsonwebtoken';

export const generateToken = (id, phone, role) => {
  return jwt.sign(
    { id, phone, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};
