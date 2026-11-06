import { visibleContentItems } from '../../../shared/contentSchema.mjs';
import { useGlobalContent } from '../context/SiteContentContext';
import BrandLogo from './BrandLogo';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrderBooking } from '../context/OrderBookingContext';
import { 
  Sparkles, 
  ShoppingBag, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck, 
  Bike,
  Menu, 
  X, 
  ChevronRight,
  Shirt
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isRider, logout } = useAuth();
  const { itemCount } = useOrderBooking();
  const { global } = useGlobalContent();
  const branding = global.section('branding');
  const copy = global.t;
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Logo destination based on user role
  const logoDestination = isAdmin ? '/admin' : isRider ? '/rider' : '/';

  // Strict role-segregated navigation links
  let navLinks = [];

  if (isAdmin) {
    // Admin navigation: dedicated operations hub only
    navLinks = [
      { name: 'Admin Hub', path: '/admin', icon: ShieldCheck }
    ];
  } else if (isRider) {
    // Rider navigation: dedicated doorstep logistics portal only
    navLinks = [
      { name: 'Rider Portal', path: '/rider', icon: Bike }
    ];
  } else {
    navLinks = visibleContentItems(global.section('navigation')?.items).filter(link => link.audience === 'all' || link.audience === (isAuthenticated ? 'customer' : 'guest')).map(link => ({ id: link.id, name: global.text(link.label), path: link.href, highlight: link.highlight }));
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all ${location.pathname === '/' ? 'id-home-nav' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <Link to={logoDestination} className="flex items-center gap-2.5 group">
            <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center motion-safe:group-hover:-rotate-6 transition-transform">
              <BrandLogo reference={branding?.logo} className="w-full h-full object-contain" width={48} height={48} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
                  {global.text(branding?.name)}<span className="text-[#5030ef]">{global.text(branding?.accent)}</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">{copy('in_fed1d87')}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                {global.text(branding?.tagline)}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const LinkIcon = link.icon;

              if (link.highlight) {
                return (
                  <Link
                    key={link.id || link.path}
                    to={link.path}
                    className="relative ml-2 mr-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm shadow-primary-600/30 transition-all flex items-center gap-1.5 hover:shadow-md"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>{link.name}</span>
                    {itemCount > 0 && (
                      <span className="ml-1 bg-amber-400 text-slate-900 text-xs font-black px-1.5 py-0.2 rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={link.id || link.path}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                    active
                      ? 'text-primary-700 bg-primary-50 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {LinkIcon && <LinkIcon className="w-4 h-4" />}
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationBell />
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-sm font-medium transition-colors"
                  title={copy('view_your_profile_account_d71788f')}
                >
                  {(() => {
                    const avatarSrc = user?.profileImage?.url || user?.profileImage?.imageUrl || (typeof user?.profileImage === 'string' ? user.profileImage : '');
                    return (
                      <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={user?.name || copy('user_b512d97')}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.navbar-avatar-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="navbar-avatar-fallback w-7 h-7 rounded-lg bg-primary-100 text-primary-700 items-center justify-center font-bold text-xs"
                          style={{ display: avatarSrc ? 'none' : 'flex' }}
                        >
                          {user?.name?.charAt(0) || copy('u_a25513c')}
                        </div>
                      </div>
                    );
                  })()}
                  <span className="max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                  {user?.role === 'admin' && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">{copy('admin_c1c224b')}</span>
                  )}
                  {user?.role === 'rider' && (
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded">{copy('rider_8eb9369')}</span>
                  )}
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title={copy('log_out_4961614')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm shadow-primary-600/30 transition-all"
              >{copy('sign_in_bcc0bcc')}</Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            {isAuthenticated && <NotificationBell />}
            {!isAdmin && !isRider && (
              <Link
                to="/book"
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl relative"
                aria-label={copy('view_booking_cart_2ed067a')}
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-slate-900 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl focus:outline-hidden"
              aria-label={copy('toggle_navigation_menu_5106483')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <Link
                  key={link.id || link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-base font-medium ${
                    isActive(link.path)
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {LinkIcon && <LinkIcon className="w-4 h-4 text-primary-600" />}
                    <span>{link.name}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                >
                  {(() => {
                    const avatarSrc = user?.profileImage?.url || user?.profileImage?.imageUrl || (typeof user?.profileImage === 'string' ? user.profileImage : '');
                    return (
                      <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={user?.name || copy('user_b512d97')}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.navbar-mobile-avatar-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="navbar-mobile-avatar-fallback w-9 h-9 rounded-xl bg-primary-100 text-primary-700 items-center justify-center font-bold text-sm"
                          style={{ display: avatarSrc ? 'none' : 'flex' }}
                        >
                          {user?.name?.charAt(0) || copy('u_a25513c')}
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email || user?.phone}</p>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100"
                >{copy('sign_out_0b184bc')}</button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 shadow-xs"
              >{copy('sign_in_bcc0bcc')}</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
