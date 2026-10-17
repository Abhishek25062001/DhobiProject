import React from 'react';
import { useOrderBooking } from '../context/OrderBookingContext';

export default function BasketReview() {
  const { cartItems, unavailableItems, reviewRequired, acknowledgeReview, removeItem, couponStatus, removeCoupon, grandTotal, bookingBlocked } = useOrderBooking();
  if (!reviewRequired && !unavailableItems.length && couponStatus.valid) return null;
  return <section role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 my-4 text-sm text-amber-950 space-y-3">
    <h3 className="font-bold">Review your updated laundry bag</h3>
    {reviewRequired && <p>Current prices and booking rules have been refreshed. Review the selections and total before continuing.</p>}
    {cartItems.filter(item => item.reviewRequired).map(item => <p key={item.cartItemId || item.garment._id}>{item.garment.name}: ₹{item.previousUnitPrice} → ₹{item.unitPrice} per piece</p>)}
    {unavailableItems.map(item => <div key={item.cartItemId || item.garment._id}><p>{item.garment.name}: {item.unavailableReason}</p><button type="button" className="underline font-bold" onClick={() => removeItem(item.cartItemId || item.garment._id)}>Remove unavailable item</button></div>)}
    {!couponStatus.valid && <p>{couponStatus.message} <button type="button" className="underline font-bold" onClick={removeCoupon}>Remove coupon</button></p>}
    {reviewRequired && <button type="button" disabled={bookingBlocked} className="rounded-xl bg-primary-600 text-white font-bold px-4 py-2 disabled:opacity-50" onClick={acknowledgeReview}>I’ve reviewed the updated total: ₹{grandTotal}</button>}
  </section>;
}
