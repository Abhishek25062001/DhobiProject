import SiteContent from '../models/SiteContent.js';
import { PAGE_DEFAULTS } from '../content/pageDefaults.js';
import { validatePageContent } from '../../shared/contentSchema.mjs';

// Match only shipped wording. Custom copy, blank fields and removed entries stay intact.
const previousCopy = {
  "doorstep_pickup_48_hour_hub_delivery_42f5b6e": [
    "Doorstep Pickup & {{home.turnaroundHours}}-Hour Hub Delivery"
  ],
  "our_operational_hubs_b64da69": [
    "Our Operational Hubs & "
  ],
  "serviceable_cities_aaadc60": [
    "Serviceable Cities"
  ],
  "indodhobi_operates_commercial_temperature_controlled_laundry_and__ecd0ee0": [
    "IndoDhobi operates commercial temperature-controlled laundry and German steam pressing hubs across Delhi NCR, Gurugram, Noida, and Bengaluru. Check your pincode below to confirm doorstep service!"
  ],
  "enter_your_6_digit_pincode_0a9af78": [
    "Enter your 6-digit pincode:"
  ],
  "active_fleet_networks_plant_locations_7960bf4": [
    "Active Fleet Networks & Plant Locations"
  ],
  "every_hub_features_dedicated_doorstep_logistics_riders_digital_ba_0d9d5d9": [
    "Every hub features dedicated doorstep logistics riders, digital bag-tagging, and 100% fabric-safe batch processing."
  ],
  "pincode_zones_c22a4e6": [
    "Pincode Zones:"
  ],
  "prominent_service_neighborhoods_37bd0fa": [
    "Prominent Service Neighborhoods:"
  ],
  "fleet_active_ready_d0c7ff6": [
    "Fleet Active & Ready"
  ],
  "schedule_wash_ea59b39": [
    "Schedule Wash"
  ],
  "free_doorstep_pickup_4ce6006": [
    "Free Doorstep Pickup"
  ],
  "complimentary_doorstep_collection_on_orders_above_399_across_all__f9a4ff2": [
    "Complimentary doorstep collection on orders above ₹{{config.freeDeliveryThreshold}} across all hubs."
  ],
  "digital_chain_of_custody_12ed623": [
    "Digital Chain of Custody"
  ],
  "physical_tamper_proof_bag_tags_and_4_digit_customer_otp_verificat_f7879f0": [
    "Physical tamper-proof bag tags and 4-digit customer OTP verification at your door."
  ],
  "german_steam_finishing_c354dd5": [
    "German Steam Finishing"
  ],
  "professional_boiler_steam_pressing_and_antiseptic_garment_sanitiz_031999c": [
    "Professional boiler steam pressing and antiseptic garment sanitization."
  ],
  "book_your_wash_in_under_60_seconds_with_live_doorstep_tracking_04b1c46": [
    "Book your wash in under 60 seconds with live doorstep tracking."
  ],
  "book_your_wash_now_00e01c2": [
    "Book Your Wash Now →",
    "Book your wash"
  ],
  "instant_pincode_checker_38bc744": [
    "Instant Pincode Checker"
  ],
  "check_serviceability_6c8dbe0": [
    "Check Serviceability"
  ],
  "book_pickup_for_cd4d6a8": [
    "Book Pickup for "
  ],
  "is_your_pincode_in_our_fleet_zone_b05c4bd": [
    "Is Your Pincode in Our Fleet Zone?"
  ]
};
const defaults = PAGE_DEFAULTS.find(page => page.pageKey === 'areas');
const currentCopy = Object.fromEntries(defaults.sections[0].content.entries.map(entry => [entry.id, entry.value]));

export function planAreasContentRefresh(page) {
  const changes = [];
  if (!page) return { page, changes };
  if (page.pageKey !== 'areas') throw new Error('Only the Service Areas page can be refreshed.');
  const sectionIndex = page.sections.findIndex(section => section.key === 'copy' && section.isVisible !== false);
  const entries = page.sections[sectionIndex]?.content?.entries || [];
  entries.forEach((entry, index) => {
    if (previousCopy[entry.id]?.includes(entry.value) && entry.value !== currentCopy[entry.id]) {
      changes.push({ path: 'sections.' + sectionIndex + '.content.entries.' + index + '.value', before: entry.value, after: currentCopy[entry.id] });
    }
  });
  for (const [field, old] of Object.entries({ title: 'Service Areas | IndoDhobi', description: 'Service Areas' })) {
    if (page.seo?.[field] === old) changes.push({ path: 'seo.' + field, before: old, after: defaults.seo[field] });
  }
  return { page, changes };
}

export async function applyAreasContentRefresh({ page, changes }) {
  if (!changes.length) return { changed: 0 };
  if (page?.pageKey !== 'areas') throw new Error('Only the Service Areas page can be refreshed.');
  const next = structuredClone(page);
  for (const { path, after } of changes) {
    const keys = path.split('.');
    const key = keys.pop();
    keys.reduce((value, part) => value[part], next)[key] = after;
  }
  validatePageContent(next);
  const saved = await SiteContent.updateOne(
    { _id: page._id, pageKey: 'areas', revision: page.revision },
    { $set: Object.fromEntries(changes.map(change => [change.path, change.after])), $inc: { revision: 1 } },
  );
  if (!saved.modifiedCount) throw new Error('Service Areas content changed. Reload and review before retrying.');
  return { changed: changes.length };
}
