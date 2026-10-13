import mongoose from 'mongoose';
import User from '../models/User.js';
import Garment from '../models/Garment.js';
import Order from '../models/Order.js';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';

dotenv.config();

export const seedData = async () => {
  try {
    const garmentCount = await Garment.countDocuments();
    let seededGarments = [];

    if (garmentCount === 0) {
      console.log('[Seeder] Database is empty. Seeding realistic Indian garments...');

      // 1. Seed Garments
      const garments = [
        // Men's Category
        {
          name: 'Men Shirt',
          category: 'Men',
          iconName: 'Shirt',
          pricing: {
            washOnly: 35,
            standardSteamIron: 15,
            crispStarchPress: 25,
            delicatePress: 30,
            dryClean: 90
          },
          isActive: true
        },
        {
          name: 'Men T-Shirt / Polo',
          category: 'Men',
          iconName: 'Shirt',
          pricing: {
            washOnly: 30,
            standardSteamIron: 15,
            crispStarchPress: 20,
            delicatePress: 25,
            dryClean: 80
          },
          isActive: true
        },
        {
          name: 'Trousers / Denim Jeans',
          category: 'Men',
          iconName: 'Scissors',
          pricing: {
            washOnly: 40,
            standardSteamIron: 20,
            crispStarchPress: 30,
            delicatePress: 35,
            dryClean: 100
          },
          isActive: true
        },
        {
          name: 'Traditional Kurta (Men)',
          category: 'Men',
          iconName: 'Sparkles',
          pricing: {
            washOnly: 50,
            standardSteamIron: 25,
            crispStarchPress: 40,
            delicatePress: 45,
            dryClean: 130
          },
          isActive: true
        },
        {
          name: 'Suit / Blazer (2-Piece)',
          category: 'Men',
          iconName: 'Award',
          pricing: {
            washOnly: 150,
            standardSteamIron: 60,
            crispStarchPress: 90,
            delicatePress: 100,
            dryClean: 299
          },
          isActive: true
        },

        // Women's Category
        {
          name: 'Cotton / Designer Kurti',
          category: 'Women',
          iconName: 'Sparkles',
          pricing: {
            washOnly: 40,
            standardSteamIron: 20,
            crispStarchPress: 30,
            delicatePress: 35,
            dryClean: 110
          },
          isActive: true
        },
        {
          name: 'Saree (Cotton / Pure Silk / Georgette)',
          category: 'Women',
          iconName: 'Feather',
          pricing: {
            washOnly: 80,
            standardSteamIron: 40,
            crispStarchPress: 65,
            delicatePress: 70,
            dryClean: 199
          },
          isActive: true
        },
        {
          name: 'Salwar Kameez / Anarkali Suit',
          category: 'Women',
          iconName: 'Sparkles',
          pricing: {
            washOnly: 70,
            standardSteamIron: 35,
            crispStarchPress: 50,
            delicatePress: 55,
            dryClean: 180
          },
          isActive: true
        },
        {
          name: 'Western Dress / Party Gown',
          category: 'Women',
          iconName: 'Heart',
          pricing: {
            washOnly: 90,
            standardSteamIron: 45,
            crispStarchPress: 60,
            delicatePress: 70,
            dryClean: 220
          },
          isActive: true
        },

        // Household Category
        {
          name: 'Single Bedsheet with Pillow Cover',
          category: 'Household',
          iconName: 'Layers',
          pricing: {
            washOnly: 50,
            standardSteamIron: 25,
            crispStarchPress: 40,
            delicatePress: 45,
            dryClean: 120
          },
          isActive: true
        },
        {
          name: 'Double / King Bedsheet Set',
          category: 'Household',
          iconName: 'Layers',
          pricing: {
            washOnly: 85,
            standardSteamIron: 40,
            crispStarchPress: 60,
            delicatePress: 65,
            dryClean: 180
          },
          isActive: true
        },
        {
          name: 'Window & Door Curtain (Per Panel)',
          category: 'Household',
          iconName: 'Wind',
          pricing: {
            washOnly: 90,
            standardSteamIron: 45,
            crispStarchPress: 70,
            delicatePress: 75,
            dryClean: 190
          },
          isActive: true
        },
        {
          name: 'Plush Bath Towel',
          category: 'Household',
          iconName: 'Cloud',
          pricing: {
            washOnly: 35,
            standardSteamIron: 15,
            crispStarchPress: 20,
            delicatePress: 25,
            dryClean: 70
          },
          isActive: true
        },

        // Winter & Heavy Category
        {
          name: 'Winter Jacket / Woolen Sweater',
          category: 'Winter & Heavy',
          iconName: 'Shield',
          pricing: {
            washOnly: 110,
            standardSteamIron: 45,
            crispStarchPress: 60,
            delicatePress: 70,
            dryClean: 210
          },
          isActive: true
        },
        {
          name: 'Heavy Quilt / Comforter / Rajai',
          category: 'Winter & Heavy',
          iconName: 'Box',
          pricing: {
            washOnly: 180,
            standardSteamIron: 70,
            crispStarchPress: 90,
            delicatePress: 100,
            dryClean: 350
          },
          isActive: true
        }
      ];

      seededGarments = await Garment.insertMany(garments);
      console.log(`[Seeder] Seeded ${seededGarments.length} Indian garments.`);
    } else {
      seededGarments = await Garment.find();
    }

    // 2. Seed Demo Users if they do not exist
    let customerUser = await User.findOne({ email: 'customer@indodhobi.com' });
    if (!customerUser) {
      customerUser = await User.create({
        name: 'Rohan Sharma',
        email: 'customer@indodhobi.com',
        phone: '9876543210',
        password: 'password123',
        role: 'customer',
        addresses: [
          {
            label: 'Home',
            flatAndBuilding: 'Flat 402, Royal Palms Apartments',
            streetAndLandmark: 'Barakhamba Road, Near Connaught Place Metro',
            city: 'New Delhi',
            pincode: '110001',
            isDefault: true
          },
          {
            label: 'Work',
            flatAndBuilding: 'Unit 7B, Cyber One Tower',
            streetAndLandmark: 'Golf Course Road, DLF Phase 5',
            city: 'Gurugram',
            pincode: '122002',
            isDefault: false
          }
        ]
      });
      console.log('[Seeder] Created demo Customer: customer@indodhobi.com / password123');
    }

    let adminUser = await User.findOne({ email: 'admin@indodhobi.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Pooja Iyer (Dhobi Ops Admin)',
        email: 'admin@indodhobi.com',
        phone: '9123456780',
        password: 'admin123',
        role: 'admin',
        addresses: [
          {
            label: 'Work',
            flatAndBuilding: 'IndoDhobi Central Processing Hub #3',
            streetAndLandmark: 'Okhla Industrial Area Phase III',
            city: 'New Delhi',
            pincode: '110020',
            isDefault: true
          }
        ]
      });
      console.log('[Seeder] Created demo Admin: admin@indodhobi.com / admin123');
    }

    // 3. Seed Demo Active Order for Rohan if empty
    const orderCount = await Order.countDocuments();
    if (orderCount === 0 && customerUser && seededGarments.length > 0) {
      const shirt = seededGarments.find((g) => g.name.includes('Shirt')) || seededGarments[0];
      const saree = seededGarments.find((g) => g.name.includes('Saree')) || seededGarments[1];

      await Order.create({
        orderNumber: 'IDB-2026-104921',
        customer: customerUser._id,
        items: [
          {
            garment: shirt._id,
            garmentName: shirt.name,
            category: shirt.category,
            quantity: 3,
            serviceType: 'WASH_AND_IRON',
            ironingType: 'STANDARD_STEAM',
            unitPrice: 50,
            lineTotal: 150
          },
          {
            garment: saree._id,
            garmentName: saree.name,
            category: saree.category,
            quantity: 2,
            serviceType: 'WASH_AND_IRON',
            ironingType: 'CRISP_STARCH',
            unitPrice: 145,
            lineTotal: 290
          }
        ],
        preferences: {
          detergentType: 'Fabric Softener Plus',
          packagingType: 'On Hangers',
          specialInstructions: 'Delicate silk saree; starch cuffs on shirts.'
        },
        pickupSchedule: {
          date: '2026-10-15',
          timeSlot: '10:00 AM - 01:00 PM'
        },
        deliverySchedule: {
          date: '2026-10-17',
          timeSlot: '02:00 PM - 05:00 PM'
        },
        pickupAddress: {
          flatAndBuilding: 'Flat 402, Royal Palms Apartments',
          streetAndLandmark: 'Barakhamba Road, Near Connaught Place',
          city: 'New Delhi',
          pincode: '110001',
          contactPhone: '9876543210'
        },
        pricingBreakdown: {
          subtotal: 440,
          pickupDeliveryFee: 0,
          expressSurcharge: 0,
          taxAmount: 22,
          grandTotal: 462
        },
        payment: {
          method: 'ONLINE',
          onlineSubMethod: 'UPI',
          status: 'PAID',
          transactionId: 'pay_sim_upi_rohan_9921',
          razorpayOrderId: 'order_sim_seed_101',
          razorpayPaymentId: 'pay_sim_upi_rohan_9921'
        },
        orderStatus: 'IN_WASHING'
      });

      console.log('[Seeder] Seeded demo active order #IDB-2026-104921 in status IN_WASHING');
    }

    console.log('[Seeder] Seeding process completed successfully!');
  } catch (error) {
    console.error('[Seeder Error]:', error);
  }
};

// Allow standalone running if invoked directly
if (process.argv[1] && process.argv[1].endsWith('seeder.js')) {
  (async () => {
    try {
      await connectDB();
      await seedData();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}

export default seedData;
