import mongoose from 'mongoose';

const featureFlagSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  { timestamps: true }
);

// Core of multi-tenant isolation: the same flag key can exist in different orgs,
// but must be unique within a single org. Enforced at the DB level, not just app level.
featureFlagSchema.index({ key: 1, organizationId: 1 }, { unique: true });

export default mongoose.model('FeatureFlag', featureFlagSchema);
