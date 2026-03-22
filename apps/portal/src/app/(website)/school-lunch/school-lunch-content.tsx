'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GraduationCap, Truck, Clock, Apple, Leaf, ShieldCheck, Phone, CalendarDays, Plus, Minus, ShoppingCart, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface SchoolLunchContentProps {
  tenantName: string;
  primaryColor: string;
  accentColor: string;
  phone: string;
}

/* ─── Menu Data ─── */

interface MenuItem {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
  priceCents: number;
}

interface MenuDay {
  day: string;
  items: MenuItem[];
  includes: string;
}

const WEEKLY_MENU: MenuDay[] = [
  {
    day: 'Wednesday',
    includes: 'Each meal includes fresh fruit and chilled juice',
    items: [
      {
        id: 'wed-chicken',
        name: 'Crispy Chicken Patty with Corn',
        description:
          'Golden-fried chicken patty on a soft bun with a generous side of buttered sweet corn. A hearty, kid-approved classic that fuels afternoon focus.',
        image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80',
        tags: ['Protein-Packed', 'Kid Favorite'],
        priceCents: 750,
      },
      {
        id: 'wed-italian',
        name: 'Italian Sub',
        description:
          'Layers of deli ham, salami, and provolone cheese on a soft hoagie roll with shredded lettuce, tomato, and a drizzle of Italian vinaigrette.',
        image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&q=80',
        tags: ['Protein-Packed', 'Filling'],
        priceCents: 750,
      },
      {
        id: 'wed-salad',
        name: 'Garden Veggie Salad',
        description:
          'Crisp romaine lettuce tossed with cherry tomatoes, cucumber, shredded carrots, and croutons. Served with ranch dressing on the side.',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
        tags: ['Vegetarian', 'Fresh'],
        priceCents: 650,
      },
    ],
  },
  {
    day: 'Friday',
    includes: 'Each meal includes fresh fruit and chilled juice',
    items: [
      {
        id: 'fri-grilled',
        name: 'Grilled Cheese with Seasoned Fries',
        description:
          'Melted American and cheddar cheese pressed between buttery, golden-toasted bread. Paired with crispy seasoned fries — the ultimate comfort lunch.',
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
        tags: ['Vegetarian', 'Comfort Food'],
        priceCents: 700,
      },
      {
        id: 'fri-ham',
        name: 'Ham Sub',
        description:
          'Thick-sliced honey ham with Swiss cheese, lettuce, and tomato on a fresh sub roll. Simple, satisfying, and packed with protein.',
        image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&q=80',
        tags: ['Protein-Packed', 'Classic'],
        priceCents: 750,
      },
      {
        id: 'fri-veggie',
        name: 'Veggie Sub',
        description:
          'A colorful stack of roasted red peppers, cucumber, avocado spread, lettuce, tomato, and provolone on a whole wheat sub roll.',
        image: 'https://images.unsplash.com/photo-1540914124281-342587941389?w=600&q=80',
        tags: ['Vegetarian', 'Healthy Choice'],
        priceCents: 700,
      },
    ],
  },
];

const HOW_IT_WORKS = [
  {
    icon: CalendarDays,
    title: 'Choose Your Meals',
    description: 'Browse the weekly menu and select lunches for your students each Wednesday and Friday.',
  },
  {
    icon: Clock,
    title: 'Order by Sunday 8 PM',
    description: 'Submit your order by Sunday evening for the following week. Easy online ordering with secure payment.',
  },
  {
    icon: Truck,
    title: 'We Deliver to Campus',
    description: 'Fresh meals arrive at your school ready to serve. No prep, no cleanup, no hassle for staff.',
  },
  {
    icon: Apple,
    title: 'Students Enjoy',
    description: 'Balanced, delicious meals that students actually want to eat. Every lunch includes fruit and juice.',
  },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/* ─── Order State Types ─── */

interface OrderItem {
  menuItem: MenuItem;
  day: string;
  quantity: number;
}

type Step = 'menu' | 'info' | 'review' | 'success';

export default function SchoolLunchContent({ tenantName, primaryColor, accentColor, phone }: SchoolLunchContentProps) {
  // Order state
  const [cart, setCart] = useState<Record<string, OrderItem>>({});
  const [step, setStep] = useState<Step>('menu');
  const [submitting, setSubmitting] = useState(false);

  // School info
  const [schoolName, setSchoolName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const cartItems = Object.values(cart).filter((i) => i.quantity > 0);
  const totalCents = cartItems.reduce((sum, i) => sum + i.menuItem.priceCents * i.quantity, 0);
  const totalMeals = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  function updateQuantity(itemId: string, day: string, menuItem: MenuItem, delta: number) {
    setCart((prev) => {
      const key = `${day}-${itemId}`;
      const existing = prev[key];
      const newQty = Math.max(0, (existing?.quantity ?? 0) + delta);
      if (newQty === 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { menuItem, day, quantity: newQty } };
    });
  }

  function getQuantity(itemId: string, day: string): number {
    return cart[`${day}-${itemId}`]?.quantity ?? 0;
  }

  function handleSubmitOrder() {
    if (!schoolName.trim() || !contactName.trim() || !contactEmail.trim() || !contactPhone.trim() || !deliveryAddress.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    // Simulate payment processing
    setTimeout(() => {
      setSubmitting(false);
      setStep('success');
      toast.success('Order placed successfully!');
    }, 2000);
  }

  /* ═══ SUCCESS SCREEN ═══ */
  if (step === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-20 px-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: primaryColor }}>
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#1a1a1a] mb-3" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Order Confirmed!
          </h1>
          <p className="text-gray-600 mb-2">
            Thank you, <strong>{contactName}</strong>. Your school lunch order for <strong>{schoolName}</strong> has been received.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            {totalMeals} meals totaling {formatCents(totalCents)}. We&apos;ll send a confirmation to {contactEmail}.
          </p>
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-bold text-sm text-gray-700 mb-3">Order Summary</h3>
            {cartItems.map((item) => (
              <div key={`${item.day}-${item.menuItem.id}`} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">
                  <span className="text-xs font-semibold uppercase text-gray-400 mr-2">{item.day}</span>
                  {item.menuItem.name} x{item.quantity}
                </span>
                <span className="font-semibold">{formatCents(item.menuItem.priceCents * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-3 font-bold">
              <span>Total</span>
              <span>{formatCents(totalCents)}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setCart({});
              setStep('menu');
              setSchoolName('');
              setContactName('');
              setContactEmail('');
              setContactPhone('');
              setDeliveryAddress('');
              setSpecialInstructions('');
            }}
            className="font-semibold text-sm hover:underline"
            style={{ color: primaryColor }}
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  /* ═══ INFO / CHECKOUT STEP ═══ */
  if (step === 'info') {
    return (
      <div className="min-h-screen bg-[#fafafa] py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setStep('menu')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Menu
          </button>

          <h1 className="text-3xl font-black text-[#1a1a1a] mb-2" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            School Information
          </h1>
          <p className="text-gray-500 mb-8">Tell us where to deliver and who to contact.</p>

          {/* Order Summary Card */}
          <div className="bg-white rounded-xl border p-6 mb-8">
            <h3 className="font-bold text-sm text-gray-700 mb-3">Your Order — {totalMeals} meals</h3>
            {cartItems.map((item) => (
              <div key={`${item.day}-${item.menuItem.id}`} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-700">
                  <span className="text-xs font-semibold uppercase text-gray-400 mr-2">{item.day}</span>
                  {item.menuItem.name} x{item.quantity}
                </span>
                <span className="font-semibold">{formatCents(item.menuItem.priceCents * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-base pt-3 font-bold border-t mt-2">
              <span>Total</span>
              <span style={{ color: primaryColor }}>{formatCents(totalCents)}</span>
            </div>
          </div>

          {/* School Info Form */}
          <div className="bg-white rounded-xl border p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">School Name *</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g., Lincoln Elementary School"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Address *</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Full school address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone *</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(219) 555-0123"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Special Instructions</label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Allergies, delivery instructions, classroom numbers, etc."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full mt-6 text-white font-bold text-lg py-4 rounded-full transition-colors shadow-lg disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? 'Processing Payment...' : `Pay ${formatCents(totalCents)}`}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            Secure payment powered by Stripe. You&apos;ll receive a confirmation email.
          </p>
        </div>
      </div>
    );
  }

  /* ═══ MENU SELECTION STEP (default) ═══ */
  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden bg-[#1a1a1a]">
        <Image
          src="https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=1400&q=80"
          alt="School cafeteria lunch trays with fresh food"
          fill
          className="object-cover"
          priority
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a]/80 via-[#1a1a1a]/50 to-transparent" />

        <div className="relative w-full max-w-6xl mx-auto px-6 py-20">
          <div className="inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6" style={{ backgroundColor: primaryColor }}>
            <GraduationCap className="h-4 w-4" />
            School Lunch Program
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-none mb-4"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Fresh Lunches,<br />
            <span style={{ color: accentColor }}>Delivered to School.</span>
          </h1>

          <p className="text-white/80 text-lg max-w-xl mb-8">
            Nutritious, kid-approved meals delivered to your campus every Wednesday and Friday.
            Select your meals below and place your order.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#order"
              className="text-white font-bold text-lg px-10 py-4 rounded-full tracking-wide transition-colors shadow-lg inline-block text-center"
              style={{ backgroundColor: primaryColor }}
            >
              Order Now
            </a>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="bg-transparent hover:bg-white/10 text-white font-semibold text-lg px-10 py-4 rounded-full border-2 border-white/30 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Call Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section className="bg-white py-6 border-b">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-8 md:gap-16 flex-wrap text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <ShieldCheck className="h-5 w-5" style={{ color: primaryColor }} />
            <span className="font-semibold">Food Safety Certified</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Leaf className="h-5 w-5" style={{ color: primaryColor }} />
            <span className="font-semibold">Fresh Ingredients Daily</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Truck className="h-5 w-5" style={{ color: primaryColor }} />
            <span className="font-semibold">Delivered to Your Campus</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Apple className="h-5 w-5" style={{ color: primaryColor }} />
            <span className="font-semibold">Fruit & Juice Included</span>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-16 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="font-bold text-sm uppercase tracking-widest mb-2" style={{ color: primaryColor }}>
              Simple & Convenient
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1a1a1a]" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              How It Works
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((stepItem, idx) => (
              <div key={stepItem.title} className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  <stepItem.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Step {idx + 1}</div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{stepItem.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{stepItem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WEEKLY MENU — WITH ORDERING ═══ */}
      <div id="order">
        {WEEKLY_MENU.map((menuDay) => (
          <section key={menuDay.day} className="py-16 bg-white even:bg-[#fafafa]">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-10">
                <div
                  className="inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-3"
                  style={{ backgroundColor: primaryColor }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {menuDay.day} Menu
                </div>
                <p className="text-gray-500 text-sm">{menuDay.includes}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {menuDay.items.map((item) => {
                  const qty = getQuantity(item.id, menuDay.day);
                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl overflow-hidden shadow-md transition-all border-2 ${
                        qty > 0 ? 'shadow-xl' : 'border-transparent hover:shadow-xl'
                      }`}
                      style={qty > 0 ? { borderColor: primaryColor } : undefined}
                    >
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized
                        />
                        {qty > 0 && (
                          <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg" style={{ backgroundColor: primaryColor }}>
                            {qty}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-1">{item.name}</h3>
                        <p className="font-bold text-base mb-2" style={{ color: primaryColor }}>{formatCents(item.priceCents)}<span className="text-gray-400 font-normal text-xs"> / meal</span></p>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">{item.description}</p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.id, menuDay.day, item, -1)}
                            disabled={qty === 0}
                            className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                            style={{ borderColor: qty > 0 ? primaryColor : '#d1d5db' }}
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-lg font-bold w-8 text-center">{qty}</span>
                          <button
                            onClick={() => updateQuantity(item.id, menuDay.day, item, 1)}
                            className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                            aria-label={`Add one ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          {qty > 0 && (
                            <span className="text-sm font-semibold ml-auto" style={{ color: primaryColor }}>
                              {formatCents(item.priceCents * qty)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ═══ STICKY CART BAR ═══ */}
      {totalMeals > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-2xl">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-[#1a1a1a]">{totalMeals} {totalMeals === 1 ? 'meal' : 'meals'} selected</p>
                <p className="text-sm text-gray-500">{formatCents(totalCents)} total</p>
              </div>
            </div>
            <button
              onClick={() => setStep('info')}
              className="text-white font-bold px-8 py-3 rounded-full transition-colors flex items-center gap-2 hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Continue to Checkout
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM CTA ═══ */}
      <section className="py-16 bg-[#1a1a1a]" style={{ marginBottom: totalMeals > 0 ? '80px' : '0' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-6" style={{ color: accentColor }} />
          <h2
            className="text-3xl lg:text-4xl font-black text-white mb-4"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Ready to Feed Your Students?
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
            We partner with schools, daycares, and after-school programs across the area.
            Flexible ordering, reliable delivery, and meals kids actually love.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md mx-auto mb-8">
            <h3 className="text-white font-bold text-lg mb-4">Weekly Ordering</h3>
            <ul className="text-white/80 text-sm space-y-3 text-left">
              <li className="flex items-start gap-3">
                <CalendarDays className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                <span>Meals delivered <strong>Wednesday &amp; Friday</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                <span>Orders due by <strong>Sunday at 8:00 PM</strong> for the following week</span>
              </li>
              <li className="flex items-start gap-3">
                <Truck className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                <span>Delivered fresh to your school — <strong>no prep needed</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Apple className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
                <span>Every meal includes <strong>fruit &amp; juice</strong></span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#order"
              className="text-white font-bold text-lg px-10 py-4 rounded-full tracking-wide transition-colors shadow-lg inline-block text-center"
              style={{ backgroundColor: primaryColor }}
            >
              Start Your Order
            </a>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="bg-transparent hover:bg-white/10 text-white font-semibold text-lg px-10 py-4 rounded-full border-2 border-white/30 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                {phone}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
