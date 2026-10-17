import React from 'react';
import { Shirt } from 'lucide-react';
import { GarmentThumbnail } from '../home/LaundryArtwork';
import './BookingBagThumbnail.css';

export default function BookingBagThumbnail({ item }) {
  const garment = item.garment;
  return (
    <div className="booking-bag-thumbnail" aria-hidden="true">
      <GarmentThumbnail garment={garment} />
    </div>
  );
}
