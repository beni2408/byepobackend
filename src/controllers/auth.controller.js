import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { signToken } from '../utils/token.js';

export async function signup(req, res, next) {
  try {
    const { email, password, organizationId } = req.body;

    if (!email || !password || !organizationId) {
      return res.status(400).json({ error: 'email, password, and organizationId are required' });
    }

    // Org admin signs up using the Organization ID shared by the Super Admin.
    // Matching by ID is more precise than by name and avoids case/whitespace ambiguity.
    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found. Check the ID with your Super Admin.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'org_admin',
      organizationId: org._id,
    });

    const token = signToken({
      userId: user._id,
      role: user.role,
      organizationId: user.organizationId,
    });

    res.status(201).json({ token, organizationId: org._id, organizationName: org.name });
  } catch (err) {
    next(err); // duplicate email → 409 via error.middleware
  }
}

export async function userSignup(req, res, next) {
  try {
    const { email, password, organizationId } = req.body;

    if (!email || !password || !organizationId) {
      return res.status(400).json({ error: 'email, password, and organizationId are required' });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found. Check the ID with your Admin.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'end_user',
      organizationId: org._id,
    });

    const token = signToken({ userId: user._id, role: user.role, organizationId: user.organizationId });
    res.status(201).json({ token, organizationId: org._id, organizationName: org.name });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).populate('organizationId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      email: user.email,
      role: user.role,
      organizationId: user.organizationId._id,
      organizationName: user.organizationId.name,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('organizationId');
    // Deliberate: same message for unknown email and wrong password to avoid user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({
      userId: user._id,
      role: user.role,
      organizationId: user.organizationId._id,
    });

    res.json({
      token,
      role: user.role,
      organizationId: user.organizationId._id,
      organizationName: user.organizationId.name,
    });
  } catch (err) {
    next(err);
  }
}
