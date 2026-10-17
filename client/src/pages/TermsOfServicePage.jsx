import ContentState from '../components/ContentState';
import ContentBlocks from '../components/ContentBlocks';
import { useGlobalContent } from '../context/SiteContentContext';
import usePageCopy from '../hooks/usePageCopy';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ShieldAlert, Shirt, Truck, Banknote, HelpCircle, ArrowLeft } from 'lucide-react';

const TermsOfServicePage = () => {
  const { config } = useGlobalContent();
  const copy = usePageCopy('terms');
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
          <span className="text-slate-800">{copy('terms_of_service_4afa55b')}</span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
              <FileCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">{copy('legal_agreement_a10eb0b')}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{copy('terms_of_service_4afa55b')}</h1>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{copy('welcome_to_indodhobi_please_read_these_terms_of_service_carefully_0268bda')}</p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <span><strong>{copy('effective_date_eef0919')}</strong>{copy('january_1_2026_9884c78')}</span>
            <span><strong>{copy('last_updated_d621a99')}</strong>{copy('october_15_2026_f87dbde')}</span>
            <span><strong>{copy('jurisdiction_2941469')}</strong>{copy('new_delhi_india_6fa4ed8')}</span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">1</span>
              <span>{copy('acceptance_eligibility_e763b40')}</span>
            </h2>
            <p>{copy('by_accessing_our_platform_or_placing_an_order_you_agree_to_be_bou_a25c099')}</p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">2</span>
              <span>{copy('doorstep_pickup_delivery_protocol_b148f67')}</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>{copy('punctuality_slots_3bdc118')}</strong>{copy('pickups_and_deliveries_are_scheduled_within_designated_time_slots_ce3c47b')}</li>
              <li>
                <strong>{copy('doorstep_otp_verification_173a3a4')}</strong>{copy('to_ensure_chain_of_custody_security_you_must_provide_the_4_digit__02b1ac5')}</li>
              <li>
                <strong>{copy('turnaround_time_6c42dfc')}</strong>{copy('standard_turnaround_time_is_48_hours_from_successful_pickup_expre_35fd0bc')}</li>
              <li>
                <strong>{copy('delivery_handover_139c753')}</strong>{copy('handover_requires_sharing_the_4_digit_delivery_otp_please_inspect_7714e1f')}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">3</span>
              <span>{copy('garment_inspection_care_discrepancy_policy_4d48d5f')}</span>
            </h2>
            <p>{copy('while_indodhobi_employs_commercial_grade_german_steam_machinery_a_3c08dfb')}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>{copy('pre_existing_defects_2824b12')}</strong>{copy('any_tears_missing_buttons_color_runs_or_stubborn_pre_existing_sta_23bf2e4')}</li>
              <li>
                <strong>{copy('valuables_in_pockets_2da0039')}</strong>{copy('customers_are_solely_responsible_for_emptying_all_garment_pockets_6555c64')}</li>
              <li>
                <strong>{copy('delicate_fabrics_e993f5e')}</strong>{copy('silks_pure_wool_pashminas_hand_embroidered_sarees_and_wedding_leh_1dbeb4e')}</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">4</span>
              <span>{copy('pricing_payments_cod_terms_308735f')}</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>{copy('transparent_pricing_efa5b5d')}</strong>{copy('all_service_rates_are_published_per_garment_and_inclusive_of_appl_3901e79')}</li>
              <li>
                <strong>{copy('cash_on_delivery_cod_328fddc')}</strong>{copy('for_cod_orders_payment_is_due_upon_doorstep_delivery_you_may_pay__cda4c48')}</li>
              <li>
                <strong>{copy('minimum_order_value_429b37d')}</strong>{copy('orders_under_399_incur_a_standard_pickup_delivery_fee_of_49_order_037a7dc')}</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">5</span>
              <span>{copy('order_cancellation_refund_policy_2463808')}</span>
            </h2>
            <p>{copy('orders_may_be_cancelled_free_of_charge_at_any_time_before_clothes_254452d')}</p>
            <p className="text-slate-600">{copy('for_cancelled_orders_where_payment_was_prepaid_online_a_100_full__22c918b')}</p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">6</span>
              <span>{copy('loss_damage_maximum_liability_cap_483c18d')}</span>
            </h2>
            <p>{copy('in_the_unlikely_event_of_physical_damage_or_loss_of_an_article_di_1d637dd')}</p>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <p>
                <strong>{copy('maximum_compensation_cap_2cd739a')}</strong>{copy('maximum_of_6341503')}<strong>{copy('10_times_the_laundering_service_charge_93a3996')}</strong>{copy('for_the_individual_item_or_33fe42a')}<strong>{copy('liabilityCap')}</strong>{copy('per_article_whichever_is_lower_upon_provision_of_an_original_purc_35a99a1')}</p>
              <p className="text-amber-800">{copy('any_claim_must_be_reported_to_577f25b')}<a href={config?.supportEmail ? `mailto:${config.supportEmail}` : undefined} className="font-bold underline">{copy('care_indodhobi_com_f7714c9')}</a>{copy('within_24_hours_of_delivery_05d2006')}</p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs flex items-center justify-center font-bold">7</span>
              <span>{copy('dispute_resolution_governing_law_64d02af')}</span>
            </h2>
            <p className="text-slate-600">{copy('these_terms_shall_be_governed_by_and_construed_in_accordance_with_d2bf2b7')}</p>
          </section>

          {/* Section 8 - Contact */}
          <section className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            <p>{copy('questions_regarding_these_terms_contact_us_at_580920f')}<a href={config?.legalEmail ? `mailto:${config.legalEmail}` : undefined} className="text-primary-600 font-bold hover:underline">{copy('legal_indodhobi_com_ff6cf14')}</a>{copy('or_call_our_support_helpline_at_1ceea86')}<strong>{copy('supportPhone')}</strong>.
            </p>
          </section>

        </div>

        <ContentBlocks content={copy.section('blocks')} text={copy.text} />

      </div>
    </div></ContentState>
  );
};

export default TermsOfServicePage;
