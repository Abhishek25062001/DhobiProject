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
  } else if (isAuthenticated) {
    // Customer navigation: retail booking & order tracking
    navLinks = [
      { name: 'Home', path: '/' },
      { name: 'Book Laundry', path: '/book', highlight: true },
      { name: 'Pricing & Services', path: '/pricing' },
      { name: 'My Orders', path: '/my-orders' }
    ];
  } else {
    // Guest navigation: public discovery & booking
    navLinks = [
      { name: 'Home', path: '/' },
      { name: 'Book Laundry', path: '/book', highlight: true },
      { name: 'Pricing & Services', path: '/pricing' }
    ];
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <Link to={logoDestination} className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-primary-700 via-primary-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform">
              <Shirt className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
                  Indo<span className="text-primary-600">Dhobi</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  IN
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                Fresh & Crisp Doorstep Laundry
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const LinkIcon = link.icon;

              if (link.highlight) {
                return (
                  <Link
                    key={link.path}
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
                  key={link.path}
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
                  title="View your profile & account"
                >
                  {(() => {
                    const avatarSrc = user?.profileImage?.url || user?.profileImage?.imageUrl || (typeof user?.profileImage === 'string' ? user.profileImage : '');
                    return (
                      <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={user?.name || 'User'}
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
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                      </div>
                    );
                  })()}
                  <span className="max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                  {user?.role === 'admin' && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                  {user?.role === 'rider' && (
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Rider
                    </span>
                  )}
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            {isAuthenticated && <NotificationBell />}
            {!isAdmin && !isRider && (
              <Link
                to="/book"
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl relative"
                aria-label="View booking cart"
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
              aria-label="Toggle navigation menu"
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
                  key={link.path}
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
                            alt={user?.name || 'User'}
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
                          {user?.name?.charAt(0) || 'U'}
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
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 shadow-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
