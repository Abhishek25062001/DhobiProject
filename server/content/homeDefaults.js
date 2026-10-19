import homeCopy from './homeCopy.json' with { type: 'json' };
// Migration and explicit admin section templates. Public rendering reads SiteContent, never these defaults.
const row = (id, fields, sortOrder = 0) => ({ id, isVisible: true, sortOrder, ...fields });
const image = sourceKey => ({ sourceKey });
export const HOME_MEDIA = {
  'home-before': { name: 'Home: before care', url: '/images/laundry/scene-before.webp' },
  'home-after': { name: 'Home: after care', url: '/images/laundry/scene-after.webp' },
  'home-wash': { name: 'Service: wash and fold', url: '/images/laundry/services/wash-fold.webp', defaultAlt: 'Neatly folded blue and white laundry topped with a soft towel' },
  'home-steam': { name: 'Service: steam iron', url: '/images/laundry/services/steam-iron-shirt.webp', defaultAlt: 'Crisply pressed pale blue shirt on a wooden hanger' },
  'home-starch': { name: 'Service: starch press', url: '/images/laundry/services/starch-kurta.webp', defaultAlt: 'Folded ivory kurta with a crisp collar and subtle embroidery' },
  'home-dry': { name: 'Service: dry clean', url: '/images/laundry/services/dry-clean-blazer.webp', defaultAlt: 'Fresh navy blazer with a white shirt and matching tie' },
  'journey-schedule': { name: 'How it works: schedule', url: '/images/laundry/journey-schedule.svg' },
  'journey-pickup': { name: 'How it works: pickup', url: '/images/laundry/laundry-atlas.webp', crop: { position: '0% 100%', size: '280% 300%', kind: 'pickup' } },
  'journey-care': { name: 'How it works: care', url: '/images/laundry/laundry-atlas.webp', crop: { position: '50% 100%', size: '300% 300%', kind: 'care' } },
  'journey-delivery': { name: 'How it works: delivery', url: '/images/laundry/laundry-atlas.webp', crop: { position: '100% 100%', size: '300% 300%', kind: 'delivery' } },
};
const section = (key, type, content, sortOrder) => ({ key, type, content, isVisible: true, sortOrder });
export const HOME_DEFAULT = {
  pageKey: 'home', schemaVersion: 1, revision: 1,
  seo: { title: 'IndoDhobi | Premium Laundry, Steam Iron & Dry Cleaning Service', description: 'Doorstep laundry, steam pressing and dry cleaning.', image: image('home-after') },
  sections: [
    section('copy', 'copy', { entries: Object.entries(homeCopy).map(([id, value]) => ({ id, value })) }, 99),
    section('hero', 'hero', {
      eyebrow: 'FRESH CLOTHES. BRIGHTER DAYS.', plain: 'Laundry,', accent: 'Sorted.', description: 'Doorstep laundry, steam pressing and dry cleaning. Choose your care, build your basket and schedule a pickup.',
      notePlain: 'Same clothes.', noteAccent: 'New confidence.', actionLabel: 'Schedule Pickup', actionHref: '/book', pickupText: 'Free pickup from ₹{{config.freeDeliveryThreshold}}', turnaroundHours: 48, paymentText: 'COD / UPI', coverageLabel: 'Check pickup availability', coverageHref: '/operational-areas', beforeLabel: 'Before', afterLabel: 'After', compareLabel: 'Drag to compare', compareHelp: 'Use the left and right arrow keys, or Home and End, when focused. Illustrative wash and press transformation.', beforeImage: image('home-before'), afterImage: image('home-after'),
      benefits: [row('pickup', { icon: 'Truck', title: 'Free\nPickup', subtitle: 'From ₹{{config.freeDeliveryThreshold}}' }, 0), row('turnaround', { icon: 'Clock3', title: '{{home.turnaroundHours}}-Hour\nTurnaround', subtitle: 'Fresh clothes, less waiting' }, 1), row('care', { icon: 'ShieldCheck', title: 'Professional\nCare', subtitle: 'A finish for every fabric' }, 2), row('choice', { icon: 'Leaf', title: 'Your Clothes,\nYour Way', subtitle: 'Choose your wash care' }, 3)],
    }, 0),
    section('journey', 'journey', { eyebrow: 'FROM YOUR DOOR. BACK TO YOU.', plain: 'How', accent: 'IndoDhobi', suffix: 'Works', intro: 'Laundry, off your to-do list.', stages: [
      row('schedule', { title: 'Schedule Pickup', description: 'Pick a time that suits you.', image: image('journey-schedule') }, 0),
      row('pickup', { title: 'We Pick Up', description: 'Right from your doorstep.', image: image('journey-pickup') }, 1),
      row('care', { title: 'We Clean with Care', description: 'Wash, press or dry clean.', image: image('journey-care') }, 2),
      row('delivery', { title: 'Fresh Delivery', description: 'Back to you in {{home.turnaroundHours}} hours.', image: image('journey-delivery') }, 3),
    ] }, 1),
    section('services', 'services', { eyebrow: 'Our services', plain: 'Every fabric.', accent: 'The right care.', intro: 'From everyday favourites to occasion wear, care tailored to every garment.', actionLabel: 'Book service', pricePrefix: 'From', priceUnit: '/ piece', unavailableText: 'Currently unavailable', items: [
      row('wash', { title: 'Wash & Fold', description: 'Freshly washed, soft and neatly folded.', badge: '', image: image('home-wash'), service: 'WASH_AND_FOLD', ironing: 'NONE' }, 0),
      row('steam', { title: 'Wash & Steam Iron', description: 'Deep cleaned and pressed for a smooth finish.', badge: 'Most Popular', image: image('home-steam'), service: 'WASH_AND_IRON', ironing: 'STANDARD_STEAM' }, 1),
      row('starch', { title: 'Crisp Starch Press', description: 'A crisp, structured finish for your cottons.', badge: '', image: image('home-starch'), service: 'IRON_ONLY', ironing: 'CRISP_STARCH' }, 2),
      row('dry', { title: 'Dry Clean & Delicate', description: 'Gentle specialist care for treasured garments.', badge: '', image: image('home-dry'), service: 'DRY_CLEAN', ironing: 'NONE' }, 3),
    ] }, 2),
    section('comparison', 'comparison', { eyebrow: 'The IndoDhobi difference', plain: 'Thoughtful care.', accent: 'At every step.', intro: 'A clearer look at how your laundry is cared for.', firstColumn: 'What matters', ownColumn: 'IndoDhobi', otherColumn: 'Other providers', scrollHint: 'Swipe or scroll sideways to compare all columns.', caption: 'IndoDhobi services and questions to ask other providers', actionLabel: 'Explore our services', actionHref: '/pricing', items: [
      row('fabric', { feature: 'Fabric care', icon: 'Shirt', own: 'Care selected for your garments', other: 'Ask about fabric-specific care' }, 0),
      row('finish', { feature: 'Finishing', icon: 'Wind', own: 'Steam and starch options', other: 'Check available finishing methods' }, 1),
      row('collection', { feature: 'Collection', icon: 'Truck', own: 'Scheduled doorstep pickup', other: 'Confirm pickup availability' }, 2),
      row('updates', { feature: 'Order updates', icon: 'Smartphone', own: 'Track your order’s progress', other: 'Ask how updates are shared' }, 3),
      row('delivery', { feature: 'Delivery', icon: 'Package', own: 'Choose your pickup and delivery slots', other: 'Confirm timings before booking' }, 4),
    ] }, 3),
    section('testimonials', 'testimonials', { eyebrow: 'Customer stories', plain: 'Fresh clothes.', accent: 'Happy customers.', intro: 'Everyday care, in our customers’ words.', items: [
      row('ananya', { name: 'Ananya Deshmukh', role: 'Product Lead, Gurugram', comment: 'Their crisp starch press on my Chanderi sarees is immaculate. No scorch marks, zero detergent smell, and they even deliver on hangers!', rating: 5, avatar: null }, 0),
      row('vikram', { name: 'Vikramaditya Sen', role: 'Advocate, High Court of Delhi', comment: 'I need crisp cotton shirts and stiff collars daily. IndoDhobi has completely replaced my erratic local dry cleaner. Free delivery above ₹399 is awesome.', rating: 5, avatar: null }, 1),
      row('meera', { name: 'Meera Iyer', role: 'Architect, Bangalore', comment: 'Tracking order progress from In Washing to Out for Delivery gives total peace of mind. Truly the modern dhobi India needed.', rating: 5, avatar: null }, 2),
    ] }, 4),
    section('areas', 'areaHeading', { eyebrow: 'Service areas', plain: 'Fresh care.', accent: 'Close to home.', intro: 'Explore our service areas and check pickup availability at your address.', actionLabel: 'Check your pincode', actionHref: '/operational-areas' }, 5),
  ],
};
