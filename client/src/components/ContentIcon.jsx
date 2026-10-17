import React from 'react';
import { Shirt, Wind, Truck, Smartphone, Package, Clock3, ShieldCheck, Leaf, Sparkles, MapPin, CreditCard, Building2, CheckCircle2, HeartHandshake } from 'lucide-react';
const icons = { Shirt, Wind, Truck, Smartphone, Package, Clock3, ShieldCheck, Leaf, Sparkles, MapPin, CreditCard, Building2, CheckCircle2, HeartHandshake };
export default function ContentIcon({ name, ...props }) { const Icon = icons[name] || Shirt; return <Icon {...props} />; }
