import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    icon: {
      type: String,
      default: 'Shirt',
      trim: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

categorySchema.pre('validate', function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

// Auto-seed defaults if collection is empty
categorySchema.statics.ensureDefaultCategories = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    const defaults = [
      { name: 'Men', slug: 'men', icon: 'Shirt', sortOrder: 1, description: 'Shirts, trousers, kurtas, suits' },
      { name: 'Women', slug: 'women', icon: 'Sparkles', sortOrder: 2, description: 'Sarees, kurtis, dresses, lehengas' },
      { name: 'Kids', slug: 'kids', icon: 'Baby', sortOrder: 3, description: 'School uniforms, rompers, baby clothes' },
      { name: 'Household & Bedding', slug: 'household-bedding', icon: 'Home', sortOrder: 4, description: 'Bedsheets, pillowcases, curtains, towels' },
      { name: 'Winter & Heavy', slug: 'winter-heavy', icon: 'Flame', sortOrder: 5, description: 'Quilts, rajais, blankets, jackets, coats' }
    ];
    await this.insertMany(defaults);
  }
};

const Category = mongoose.model('Category', categorySchema);
export default Category;
