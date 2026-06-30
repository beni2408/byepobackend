import FeatureFlag from '../models/FeatureFlag.js';

// Authenticated endpoint — organizationId comes from the end user's JWT token,
// not from the request body, so the user can only check flags for their own org.
export async function checkFeature(req, res, next) {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const organizationId = req.user.organizationId;

    const flag = await FeatureFlag.findOne({
      key: key.trim().toLowerCase(),
      organizationId,
    });

    if (!flag) {
      return res.status(404).json({ error: `Feature key "${key}" not found for your organization` });
    }

    res.json({ key: flag.key, enabled: flag.enabled });
  } catch (err) {
    next(err);
  }
}
