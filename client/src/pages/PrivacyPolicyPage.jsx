import ContentState from '../components/ContentState';
import ContentBlocks from '../components/ContentBlocks';
import { useGlobalContent } from '../context/SiteContentContext';
import usePageCopy from '../hooks/usePageCopy';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, FileText, CheckCircle, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

const PrivacyPolicyPage = () => {
  const { config } = useGlobalContent();
  const copy = usePageCopy('privacy');
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <ContentState resource={copy}><div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{copy('back_to_home_eec7842')}</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800">{copy('privacy_policy_506ff39')}</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center shadow-xs">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-700">{copy('legal_compliance_b122f3a')}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{copy('privacy_policy_506ff39')}</h1>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{copy('at_indodhobi_technologies_pvt_ltd_indodhobi_we_us_or_our_we_value_3616057')}</p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <span><strong>{copy('effective_date_eef0919')}</strong>{copy('january_1_2026_9884c78')}</span>
            <span><strong>{copy('last_updated_d621a99')}</strong>{copy('october_15_2026_f87dbde')}</span>
            <span><strong>{copy('version_4c5726e')}</strong> {copy('policyVersion')}</span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">1</span>
              <span>{copy('information_we_collect_a554871')}</span>
            </h2>
            <p>{copy('when_you_use_indodhobi_services_create_an_account_schedule_laundr_171443e')}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>{copy('personal_identity_contact_6602c2f')}</strong>{copy('full_name_verified_mobile_phone_number_via_otp_and_optional_email_a47ab15')}</li>
              <li>
                <strong>{copy('doorstep_logistics_address_0201b41')}</strong>{copy('house_flat_number_apartment_building_name_street_nearby_landmark__b7912b7')}</li>
              <li>
                <strong>{copy('order_laundry_specifications_c489a40')}</strong>{copy('selected_garment_categories_quantities_custom_fabric_instructions_aaf84f6')}</li>
              <li>
                <strong>{copy('inspection_verification_media_e94e6c6')}</strong>{copy('photographs_of_pre_existing_garment_stains_tears_or_tag_markings__7a87849')}</li>
              <li>
                <strong>{copy('payment_information_380c59b')}</strong>{copy('transaction_identifiers_payment_mode_cash_on_delivery_upi_dynamic_369b3f5')}<em>{copy('not_254bb97')}</em>{copy('store_full_credit_debit_card_numbers_or_upi_pins_54bd513')}</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">2</span>
              <span>{copy('how_we_use_your_information_9785e87')}</span>
            </h2>
            <p>{copy('your_data_is_processed_strictly_for_legitimate_operational_purpos_02d04c0')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />{copy('service_fulfillment_1ce000c')}</span>
                <p className="text-xs text-slate-500">{copy('dispatching_verified_doorstep_riders_processing_laundry_in_temper_1fe389c')}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />{copy('real_time_notifications_e8f94f2')}</span>
                <p className="text-xs text-slate-500">{copy('transmitting_4_digit_pickup_and_delivery_verification_otps_rider__0030ed3')}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />{copy('quality_discrepancy_audits_e937313')}</span>
                <p className="text-xs text-slate-500">{copy('resolving_garment_count_mismatches_spot_treatments_and_damage_cla_f0cc69b')}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />{copy('legal_tax_compliance_3ebfb91')}</span>
                <p className="text-xs text-slate-500">{copy('generating_compliant_gst_tax_invoices_and_maintaining_audit_ledge_5ca0cbc')}</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">3</span>
              <span>{copy('data_protection_security_measures_26ea8b8')}</span>
            </h2>
            <p>{copy('we_implement_industry_standard_administrative_physical_and_techni_568898b')}</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>{copy('all_web_and_api_traffic_is_encrypted_in_transit_using_transport_l_157fff8')}</li>
              <li>{copy('databases_are_encrypted_at_rest_with_automated_daily_backups_and__86be172')}</li>
              <li>{copy('doorstep_riders_have_time_limited_role_based_access_strictly_to_o_261e95a')}</li>
              <li>{copy('payment_transactions_are_handled_through_pci_dss_level_1_complian_badb230')}</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">4</span>
              <span>{copy('third_party_sharing_disclosures_23291b1')}</span>
            </h2>
            <p>{copy('we_do_e9022b6')}<strong>{copy('not_254bb97')}</strong>{copy('sell_rent_or_trade_your_personal_information_to_third_party_adver_8ceee7a')}</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>{copy('certified_logistics_personnel_8f9bf68')}</strong>{copy('verified_riders_who_require_your_delivery_address_and_phone_numbe_c3d84c3')}</li>
              <li><strong>{copy('payment_service_providers_2865788')}</strong>{copy('razorpay_software_pvt_ltd_and_banking_partners_for_processing_dig_b3a7677')}</li>
              <li><strong>{copy('cloud_infrastructure_providers_8cfef5b')}</strong>{copy('iso_27001_certified_hosting_and_cloudinary_media_storage_for_insp_b6e6752')}</li>
              <li><strong>{copy('law_enforcement_authorities_c76824d')}</strong>{copy('when_required_by_binding_court_orders_or_statutory_mandates_under_2f46662')}</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">5</span>
              <span>{copy('your_rights_under_dpdp_act_00a8ecc')}</span>
            </h2>
            <p>{copy('as_a_customer_you_retain_full_rights_to_0ff927a')}</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>{copy('access_a_summary_of_personal_data_held_about_you_and_past_order_i_507fcc2')}</li>
              <li>{copy('request_correction_or_updating_of_inaccurate_addresses_or_contact_cbc5fc3')}</li>
              <li>{copy('request_account_erasure_and_deletion_of_your_profile_data_subject_b61f781')}</li>
              <li>{copy('nominate_a_representative_in_case_of_incapacity_9200de2')}</li>
            </ul>
          </section>

          {/* Section 6 - Grievance Officer */}
          <section className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary-600" />
              <span>{copy('grievance_officer_contact_information_923108e')}</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{copy('in_accordance_with_the_information_technology_act_2000_and_the_di_3354492')}</p>
            <div className="text-xs text-slate-700 space-y-1 pt-1 font-medium">
              <p><strong>{copy('name_2683cad')}</strong>{copy('grievance_redressal_officer_indodhobi_5ad1220')}</p>
              <p><strong>{copy('company_a7aeec6')}</strong>{copy('indodhobi_technologies_pvt_ltd_ba18ece')}</p>
              <p><strong>{copy('registered_address_934dcda')}</strong>{copy('barakhamba_road_connaught_place_new_delhi_delhi_110001_410b89d')}</p>
              <p><strong>{copy('email_17507dc')}</strong> <a href={config?.privacyEmail ? `mailto:${config.privacyEmail}` : undefined} className="text-primary-600 font-bold hover:underline">{copy('privacy_indodhobi_com_45a3e9f')}</a> / <a href={config?.supportEmail ? `mailto:${config.supportEmail}` : undefined} className="text-primary-600 font-bold hover:underline">{copy('care_indodhobi_com_f7714c9')}</a></p>
              <p><strong>{copy('phone_3305eb5')}</strong>{copy('91_98765_43210_mon_sat_9_00_am_6_00_pm_ist_6a1c80b')}</p>
            </div>
          </section>

        </div>

        <ContentBlocks content={copy.section('blocks')} text={copy.text} />

      </div>
    </div></ContentState>
  );
};

export default PrivacyPolicyPage;
