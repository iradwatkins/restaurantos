'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap, Truck, Clock, Apple, Leaf, ShieldCheck, Phone, CalendarDays } from 'lucide-react';

interface SchoolLunchContentProps {
  tenantName: string;
  primaryColor: string;
  accentColor: string;
  phone: string;
}

/* ─── Menu Data ─── */

interface MenuItem {
  name: string;
  description: string;
  image: string;
  tags: string[];
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
        name: 'Crispy Chicken Patty with Corn',
        description:
          'Golden-fried chicken patty on a soft bun with a generous side of buttered sweet corn. A hearty, kid-approved classic that fuels afternoon focus.',
        image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80',
        tags: ['Protein-Packed', 'Kid Favorite'],
      },
      {
        name: 'Italian Sub',
        description:
          'Layers of deli ham, salami, and provolone cheese on a soft hoagie roll with shredded lettuce, tomato, and a drizzle of Italian vinaigrette.',
        image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&q=80',
        tags: ['Protein-Packed', 'Filling'],
      },
      {
        name: 'Garden Veggie Salad',
        description:
          'Crisp romaine lettuce tossed with cherry tomatoes, cucumber, shredded carrots, and croutons. Served with ranch dressing on the side.',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
        tags: ['Vegetarian', 'Fresh'],
      },
    ],
  },
  {
    day: 'Friday',
    includes: 'Each meal includes fresh fruit and chilled juice',
    items: [
      {
        name: 'Grilled Cheese with Seasoned Fries',
        description:
          'Melted American and cheddar cheese pressed between buttery, golden-toasted bread. Paired with crispy seasoned fries — the ultimate comfort lunch.',
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80',
        tags: ['Vegetarian', 'Comfort Food'],
      },
      {
        name: 'Ham Sub',
        description:
          'Thick-sliced honey ham with Swiss cheese, lettuce, and tomato on a fresh sub roll. Simple, satisfying, and packed with protein.',
        image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&q=80',
        tags: ['Protein-Packed', 'Classic'],
      },
      {
        name: 'Veggie Sub',
        description:
          'A colorful stack of roasted red peppers, cucumber, avocado spread, lettuce, tomato, and provolone on a whole wheat sub roll.',
        image: 'https://images.unsplash.com/photo-1540914124281-342587941389?w=600&q=80',
        tags: ['Vegetarian', 'Healthy Choice'],
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

export default function SchoolLunchContent({ tenantName, primaryColor, accentColor, phone }: SchoolLunchContentProps) {
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
            No prep for staff. No stress for parents. Just good food for growing minds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="text-white font-bold text-lg px-10 py-4 rounded-full tracking-wide transition-colors shadow-lg inline-block text-center"
              style={{ backgroundColor: primaryColor }}
            >
              Enroll Your School
            </Link>
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
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.title} className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Step {idx + 1}</div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WEEKLY MENU ═══ */}
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
              {menuDay.items.map((item) => (
                <div key={item.name} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
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
                    <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{item.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ═══ FOR SCHOOLS CTA ═══ */}
      <section className="py-16 bg-[#1a1a1a]">
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
            <Link
              href="/contact"
              className="text-white font-bold text-lg px-10 py-4 rounded-full tracking-wide transition-colors shadow-lg inline-block text-center"
              style={{ backgroundColor: primaryColor }}
            >
              Contact Us to Enroll
            </Link>
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
