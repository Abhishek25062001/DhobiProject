import { visibleContentItems } from '../../../shared/contentSchema.mjs';
import ContentAssurances from './ContentAssurances';
import { useGlobalContent } from '../context/SiteContentContext';
import ManagedImage from './ManagedImage';
import useServiceAreas from '../hooks/useServiceAreas';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shirt, Phone, Mail, MapPin, ShieldCheck, HeartHandshake, Sparkles, Clock, ExternalLink } from 'lucide-react';

const Footer = () => {
  const { global } = useGlobalContent();
  const branding = global.section('branding');
  const copy = global.t;
  const { areas } = useServiceAreas();
  const isHome = useLocation().pathname === "/";
  return (
    <footer className={`bg-slate-900 text-slate-300 pt-16 pb-12 mt-auto border-t border-slate-800 ${isHome ? 'id-home-footer' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Assurances Bar */}
        <ContentAssurances footer content={global.section('assurances')} text={global.text} />

        {/* Links & Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 py-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white shadow-md">
                <ManagedImage optional reference={branding?.logo} className="w-5 h-5" width={20} height={20} />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                {global.text(branding?.name)}<span className="text-primary-400">{global.text(branding?.accent)}</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              {global.text(branding?.description)}
            </p>
            <div className="text-xs text-teal-400 font-semibold flex items-center gap-1.5">
              <span>{copy('serving_over_45_000_happy_households_0384e42')}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-4">{global.text(global.section('footerServices')?.title)}</h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {visibleContentItems(global.section('footerServices')?.items).map(item => <li key={item.id}><Link to={item.href} className="hover:text-primary-400 transition-colors">{global.text(item.label)}</Link></li>)}
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-4">{copy('operational_hubs_74b95fc')}</h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {areas.map(hub => <li key={hub._id}>
                <Link to="/operational-areas" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span>{hub.footerLabel}</span>
                </Link>
              </li>)}
              <li className="pt-1">
                <Link to="/operational-areas" className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-bold text-[11px]">
                  <span>{copy('view_all_serviceable_pincodes_97a5519')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-4">{copy('customer_care_a5f6f28')}</h5>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{copy('91_98765_43210_7_am_10_pm_6281f79')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{copy('care_indodhobi_com_f7714c9')}</span>
              </li>
              <li className="pt-2">
                <span className="inline-block px-3 py-1.5 rounded-lg bg-slate-800 text-teal-300 text-[11px] font-medium border border-slate-700">{copy('gst_registered_fssai_sanitized_standards_a0f85fb')}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()}{copy('indodhobi_technologies_pvt_ltd_all_rights_reserved_4e96ad9')}</p>
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            {visibleContentItems(global.section('footerLinks')?.items).map(item => /^https:/.test(item.href) ? <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition-colors inline-flex items-center gap-1 font-semibold text-slate-400 hover:text-white"><span>{global.text(item.label)}</span><ExternalLink className="w-3 h-3 text-slate-500" /></a> : <Link key={item.id} to={item.href} className="hover:text-primary-400 transition-colors">{global.text(item.label)}</Link>)}
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
