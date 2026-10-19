import React from 'react';
import { Shirt, Wind, Truck, Smartphone, Package, Clock3, ShieldCheck, Leaf, Sparkles, MapPin, CreditCard, Building2, CheckCircle2, HeartHandshake, Droplets, WashingMachine, BadgeCheck, Award, Heart, Star, Sun, Zap, Timer, CalendarCheck, CircleCheck, CircleHelp, Recycle, Sprout, Flower2, Wallet, Banknote, ShoppingBag, Gift, Home, Phone, Mail, Headphones, Smile, ThumbsUp, Shield, Gem, Hand, Coffee, Scissors } from 'lucide-react';
import ManagedImage from './ManagedImage';
const icons = { Shirt, Wind, Truck, Smartphone, Package, Clock3, ShieldCheck, Leaf, Sparkles, MapPin, CreditCard, Building2, CheckCircle2, HeartHandshake, Droplets, WashingMachine, BadgeCheck, Award, Heart, Star, Sun, Zap, Timer, CalendarCheck, CircleCheck, CircleHelp, Recycle, Sprout, Flower2, Wallet, Banknote, ShoppingBag, Gift, Home, Phone, Mail, Headphones, Smile, ThumbsUp, Shield, Gem, Hand, Coffee, Scissors };
export default function ContentIcon({ name, size = 24, className = '', strokeWidth, ...props }) {
  if (name && typeof name === 'object') return <ManagedImage reference={name} width={size} height={size} className={`object-contain shrink-0 ${className}`} style={{ width: size, height: size }} {...props} />;
  const Icon = icons[name] || Shirt;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} {...props} />;
}
