import Organization from '../models/Organization.js';
import { signToken } from '../utils/token.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Super Admin credentials live in .env only — never stored in DB.
    // String comparison is sufficient here because both sides are server-controlled secrets.
    if (
      email !== process.env.SUPER_ADMIN_EMAIL ||
      password !== process.env.SUPER_ADMIN_PASSWORD
    ) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ role: 'super_admin' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

export async function createOrganization(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const org = await Organization.create({ name: name.trim() });
    res.status(201).json(org);
  } catch (err) {
    next(err); // Mongoose 11000 duplicate → 409 via error.middleware
  }
}

export async function listOrganizations(_req, res, next) {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    res.json(orgs);
  } catch (err) {
    next(err);
  }
}

export async function deleteOrganization(req, res, next) {
  try {
    const org = await Organization.findByIdAndDelete(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({ message: `"${org.name}" deleted` });
  } catch (err) {
    next(err);
  }
}

export async function updateOrganization(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err) {
    next(err); // duplicate name → 409 via error.middleware
  }
}
