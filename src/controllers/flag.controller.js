import FeatureFlag from '../models/FeatureFlag.js';

// organizationId is always taken from req.user (the verified JWT) — never from the
// request body. This is the sole enforcement point for multi-tenant isolation.

export async function createFlag(req, res, next) {
  try {
    const { key } = req.body;
    if (!key || !key.trim()) {
      return res.status(400).json({ error: 'key is required' });
    }

    const flag = await FeatureFlag.create({
      key: key.trim().toLowerCase(),
      organizationId: req.user.organizationId,
    });

    res.status(201).json(flag);
  } catch (err) {
    next(err); // duplicate { key, organizationId } → 409 via error.middleware
  }
}

export async function listFlags(req, res, next) {
  try {
    const flags = await FeatureFlag.find({ organizationId: req.user.organizationId }).sort({ createdAt: -1 });
    res.json(flags);
  } catch (err) {
    next(err);
  }
}

export async function updateFlag(req, res, next) {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled (boolean) is required' });
    }

    // Filter by both _id AND organizationId so an admin cannot modify another org's flag
    // even if they somehow know its ObjectId.
    const flag = await FeatureFlag.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { enabled },
      { new: true }
    );

    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json(flag);
  } catch (err) {
    next(err);
  }
}

export async function deleteFlag(req, res, next) {
  try {
    const flag = await FeatureFlag.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json({ message: 'Flag deleted' });
  } catch (err) {
    next(err);
  }
}
