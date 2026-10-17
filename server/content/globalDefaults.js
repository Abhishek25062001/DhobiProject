import copy from './globalCopy.json' with { type: 'json' };
const item = (id, sortOrder, fields) => ({ id, sortOrder, isVisible: true, ...fields });
const section = (key, type, content, sortOrder) => ({ key, type, content, sortOrder, isVisible: true });
export const GLOBAL_MEDIA = {
  'global-logo': { name: 'Brand: logo', url: '/images/laundry/brand-mark.svg', defaultAlt: '', sourceKey: 'global-logo' },
  'global-favicon': { name: 'Brand: favicon', url: '/images/laundry/brand-favicon.svg', defaultAlt: '', sourceKey: 'global-favicon' },
};
export const GLOBAL_DEFAULT = {
  pageKey: 'global', schemaVersion: 1, revision: 1,
  seo: { title: 'IndoDhobi | Premium Laundry, Steam Iron & Dry Cleaning Service', description: 'Fresh & Crisp Doorstep Laundry', image: null },
  sections: [
    section('branding', 'branding', { name: 'Indo', accent: 'Dhobi', tagline: 'Fresh & Crisp Doorstep Laundry', description: 'Transforming traditional Indian dhobi care with German steam finishing, eco-detergents, and verified doorstep pickup across Delhi NCR & metros.', logo: { sourceKey: 'global-logo' }, favicon: { sourceKey: 'global-favicon' } }, 0),
    section('navigation', 'navigation', { title: '', items: [
      item('home', 0, { label: 'Home', href: '/', audience: 'all', highlight: false }),
      item('book', 1, { label: 'Book Laundry', href: '/book', audience: 'all', highlight: true }),
      item('pricing', 2, { label: 'Pricing & Services', href: '/pricing', audience: 'all', highlight: false }),
      item('areas', 3, { label: 'Service Areas', href: '/operational-areas', audience: 'all', highlight: false }),
      item('orders', 4, { label: 'My Orders', href: '/my-orders', audience: 'customer', highlight: false }),
    ] }, 1),
    section('footerServices', 'links', { title: 'Our Services', items: ['Daily Wash & Fold', 'Steam Iron & Crisp Press', 'Premium Silk & Saree Care', 'Suit & Sherwani Dry Cleaning', 'Curtains & Bedding Sanitization'].map((label, index) => item(`service-${index}`, index, { label, href: '/book' })) }, 2),
    section('footerLinks', 'links', { title: '', items: [
      item('privacy', 0, { label: 'Privacy Policy', href: '/privacy' }), item('terms', 1, { label: 'Terms of Service', href: '/terms' }), item('partner', 2, { label: 'Dhobi Partner Portal', href: 'https://avyaktinfotech.com' }),
    ] }, 3),
    section('assurances', 'assurances', { items: [
      item('turnaround', 0, { title: '{{home.turnaroundHours}}-Hr Turnaround', description: 'Guaranteed on-time doorstep delivery', icon: 'Clock3', image: null }),
      item('care', 1, { title: '100% Fabric Safe', description: 'Antiseptic wash & color preservation', icon: 'ShieldCheck', image: null }),
      item('finishing', 2, { title: 'Crisp Starch Press', description: 'Custom temperature steam iron', icon: 'Sparkles', image: null }),
      item('payment', 3, { title: 'COD & Online UPI', description: 'Pay on delivery or seamless online', icon: 'HeartHandshake', image: null }),
    ] }, 4),
    section('copy', 'copy', { entries: Object.entries(copy).map(([id, value]) => ({ id, value })) }, 4),
  ],
};
