import React from 'react';
import { Link } from 'react-router-dom';
import { Shirt, Phone, Mail, MapPin, ShieldCheck, HeartHandshake, Sparkles, Clock, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Assurances Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-slate-800 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-900/60 text-primary-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">48-Hr Turnaround</h4>
              <p className="text-xs text-slate-400">Guaranteed on-time doorstep delivery</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-900/60 text-teal-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">100% Fabric Safe</h4>
              <p className="text-xs text-slate-400">Antiseptic wash & color preservation</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900/60 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Crisp Starch Press</h4>
              <p className="text-xs text-slate-400">Custom temperature steam iron</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/60 text-indigo-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">COD & Online UPI</h4>
              <p className="text-xs text-slate-400">Pay on delivery or seamless online</p>
            </div>
          </div>
        </div>

        {/* Links & Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 py-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white shadow-md">
                <Shirt className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Indo<span className="text-primary-400">Dhobi</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Transforming traditional Indian dhobi care with German steam finishing, eco-detergents, and verified doorstep pickup across Delhi NCR & metros.
            </p>
            <div className="text-xs text-teal-400 font-semibold flex items-center gap-1.5">
              <span>● Serving over 45,000+ happy households</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-4">Our Services</h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/book" className="hover:text-primary-400 transition-colors">Daily Wash & Fold</Link></li>
              <li><Link to="/book" className="hover:text-primary-400 transition-colors">Steam Iron & Crisp Press</Link></li>
              <li><Link to="/book" className="hover:text-primary-400 transition-colors">Premium Silk & Saree Care</Link></li>
              <li><Link to="/book" className="hover:text-primary-400 transition-colors">Suit & Sherwani Dry Cleaning</Link></li>
              <li><Link to="/book" className="hover:text-primary-400 transition-colors">Curtains & Bedding Sanitization</Link></li>
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-4">Operational Hubs</h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/operational-areas" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span>South Delhi &amp; Connaught Place</span>
                </Link>
              </li>
              <li>
                <Link to="/operational-areas" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span>Gurugram (DLF Phase 1-5, Golf Course Rd)</span>
                </Link>
              </li>
              <li>
                <Link to="/operational-areas" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span>Noida &amp; Greater Noida Expressway</span>
                </Link>
              </li>
              <li>
                <Link to="/operational-areas" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span>Bengaluru (Indiranagar, Koramangala)</span>
                </Link>
              </li>
              <li className="pt-1">
                <Link to="/operational-areas" className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-bold text-[11px]">
                  <span>View All Serviceable Pincodes &rarr;</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-4">Customer Care</h5>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                <span>+91 98765 43210 (7 AM - 10 PM)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span>care@indodhobi.com</span>
              </li>
              <li className="pt-2">
                <span className="inline-block px-3 py-1.5 rounded-lg bg-slate-800 text-teal-300 text-[11px] font-medium border border-slate-700">
                  GST Registered • FSSAI Sanitized Standards
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} IndoDhobi Technologies Pvt Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5 sm:gap-6">
            <Link to="/privacy" className="hover:text-primary-400 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary-400 transition-colors">
              Terms of Service
            </Link>
            <a
              href="https://avyaktinfotech.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-400 transition-colors inline-flex items-center gap-1 font-semibold text-slate-400 hover:text-white"
            >
              <span>Dhobi Partner Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
