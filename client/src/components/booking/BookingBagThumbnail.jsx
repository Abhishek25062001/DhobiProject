import React from 'react';
import { Shirt } from 'lucide-react';
import { GarmentThumbnail } from '../home/LaundryArtwork';
import './BookingBagThumbnail.css';

export default function BookingBagThumbnail({ item }) {
  const garment = item.garment;
  const hasArtwork = garment?.imageUrl || (!item.isCustomItem && /shirt|polo|trouser|jeans|kurta|kurti|saree|blazer|bedsheet|towel|curtain|quilt|comforter|rajai/i.test(garment?.name || ''));
  return (
    <div className="booking-bag-thumbnail" aria-hidden="true">
      {hasArtwork ? <GarmentThumbnail garment={garment} /> : <Shirt size={22} className="text-primary-600" />}
    </div>
  );
}
