import book from './bookCopy.json' with { type: 'json' };
import pricing from './pricingCopy.json' with { type: 'json' };
import privacy from './privacyCopy.json' with { type: 'json' };
import terms from './termsCopy.json' with { type: 'json' };
import areas from './areasCopy.json' with { type: 'json' };
import login from './loginCopy.json' with { type: 'json' };
import register from './registerCopy.json' with { type: 'json' };
import profile from './profileCopy.json' with { type: 'json' };
import orders from './ordersCopy.json' with { type: 'json' };
import orderSuccess from './order-successCopy.json' with { type: 'json' };

const names = { book: 'Book Laundry', pricing: 'Pricing & Services', privacy: 'Privacy Policy', terms: 'Terms of Service', areas: 'Service Areas', login: 'Sign In', register: 'Register', profile: 'Your Profile', orders: 'My Orders', 'order-success': 'Booking Confirmed' };
export const PAGE_DEFAULTS = Object.entries({ book, pricing, privacy, terms, areas, login, register, profile, orders, 'order-success': orderSuccess }).map(([pageKey, copy]) => ({
  pageKey, schemaVersion: 1, revision: 1, seo: { title: `${names[pageKey]} | IndoDhobi`, description: pageKey === 'book' ? 'Choose your garments, care and pickup schedule.' : names[pageKey], image: null },
  sections: [{ key: 'copy', type: 'copy', isVisible: true, sortOrder: 0, content: { entries: Object.entries(copy).map(([id, value]) => ({ id, value })) } }],
}));
