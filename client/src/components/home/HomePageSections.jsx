import React from 'react';
import './GarmentServices.css';
import './HomeTrustSections.css';
import './ServiceAreas.css';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  Star,
  Shirt,
  Wind,
  Smartphone,
  Package,
  Quote,
  Building2
} from 'lucide-react';

const HomePageSections = () => {

  const services = [
    {
      title: 'Wash & Fold',
      desc: 'Freshly washed, soft and neatly folded.',
      price: 'From ₹30 / piece',
      image: 'wash-fold',
      alt: 'Neatly folded blue and white laundry topped with a soft towel',
    },
    {
      title: 'Wash & Steam Iron',
      desc: 'Deep cleaned and pressed for a smooth finish.',
      price: 'From ₹45 / piece',
      image: 'steam-iron-shirt',
      alt: 'Crisply pressed pale blue shirt on a wooden hanger',
      badge: 'Most Popular',
    },
    {
      title: 'Crisp Starch Press',
      desc: 'A crisp, structured finish for your cottons.',
      price: 'From ₹25 / piece',
      image: 'starch-kurta',
      alt: 'Folded ivory kurta with a crisp collar and subtle embroidery',
    },
    {
      title: 'Dry Clean & Delicate',
      desc: 'Gentle specialist care for treasured garments.',
      price: 'From ₹90 / piece',
      image: 'dry-clean-blazer',
      alt: 'Fresh navy blazer with a white shirt and matching tie',
    },
  ];

  const comparisons = [
    { feature: 'Fabric care', icon: Shirt, indo: 'Care selected for your garments', other: 'Ask about fabric-specific care' },
    { feature: 'Finishing', icon: Wind, indo: 'Steam and starch options', other: 'Check available finishing methods' },
    { feature: 'Collection', icon: Truck, indo: 'Scheduled doorstep pickup', other: 'Confirm pickup availability' },
    { feature: 'Order updates', icon: Smartphone, indo: 'Track your order’s progress', other: 'Ask how updates are shared' },
    { feature: 'Delivery', icon: Package, indo: 'Choose your pickup and delivery slots', other: 'Confirm timings before booking' },
  ];

  const serviceAreas = [
    { badge: 'Flagship Hub', city: 'Delhi NCR Central & South', areas: 'Connaught Place, Vasant Kunj, Hauz Khas, Saket, Dwarka & more.', pincodes: '110001–110085' },
    { badge: 'Express Hub', city: 'Gurugram CyberCity', areas: 'DLF Phases 1–5, Cyber Hub, Golf Course Road, Sohna Road & more.', pincodes: '122001–122018' },
    { badge: 'Expressway Hub', city: 'Noida & Greater Noida', areas: 'Sectors 18, 50, 62 & 137, Expressway high-rises, Pari Chowk & more.', pincodes: '201301–201310' },
    { badge: 'Southern Hub', city: 'Bengaluru Tech Hub', areas: 'Indiranagar, Koramangala, HSR Layout, Whitefield & more.', pincodes: '560001–560103' },
  ];

  const testimonials = [
    {
      name: 'Ananya Deshmukh',
      role: 'Product Lead, Gurugram',
      comment: 'Their crisp starch press on my Chanderi sarees is immaculate. No scorch marks, zero detergent smell, and they even deliver on hangers!',
      rating: 5,
    },
    {
      name: 'Vikramaditya Sen',
      role: 'Advocate, High Court of Delhi',
      comment: 'I need crisp cotton shirts and stiff collars daily. IndoDhobi has completely replaced my erratic local dry cleaner. Free delivery above ₹399 is awesome.',
      rating: 5,
    },
    {
      name: 'Meera Iyer',
      role: 'Architect, Bangalore',
      comment: 'Tracking order progress from In Washing to Out for Delivery gives total peace of mind. Truly the modern dhobi India needed.',
      rating: 5,
    },
  ];

  return (
    <div className="home-sections">
      
      {/* SERVICES OVERVIEW */}
      <section className="garment-services" aria-labelledby="garment-services-heading">
        <div className="garment-services__shell">
          <header className="garment-services__header">
            <p className="garment-services__eyebrow">Our services</p>
            <h2 id="garment-services-heading">Every fabric. <span>The right care.</span></h2>
            <p className="garment-services__intro">
              From everyday favourites to occasion wear, care tailored to every garment.
            </p>
          </header>
          <div className="garment-services__grid">
            {services.map((service) => (
              <article
                key={service.image}
                className={`garment-service${service.badge ? ' garment-service--featured' : ''}`}
              >
                {service.badge && <span className="garment-service__badge">{service.badge}</span>}
                <div className="garment-service__visual">
                  <img
                    src={`/images/laundry/services/${service.image}.webp`}
                    alt={service.alt}
                    width="1254"
                    height="1254"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="garment-service__copy">
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                </div>
                <footer className="garment-service__footer">
                  <p className="garment-service__price">{service.price}</p>
                  <Link
                    to="/book"
                    className="garment-service__book"
                    aria-label={`Book ${service.title}`}
                  >
                    Book service <ArrowRight size={19} aria-hidden="true" />
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="home-trust home-comparison" aria-labelledby="comparison-heading">
        <div className="home-trust__shell">
          <header className="home-trust__header">
            <p className="home-trust__eyebrow">The IndoDhobi difference</p>
            <h2 id="comparison-heading">Thoughtful care. <span>At every step.</span></h2>
            <p>A clearer look at how your laundry is cared for.</p>
          </header>
          <p className="home-comparison__scroll-hint" id="comparison-scroll-hint">Swipe or scroll sideways to compare all columns.</p>
          <div aria-describedby="comparison-scroll-hint" className="home-comparison__table-wrap" role="region" aria-label="Laundry service comparison" tabIndex={0}>
            <table className="home-comparison__table">
              <caption className="sr-only">IndoDhobi services and questions to ask other providers</caption>
              <colgroup><col className="home-comparison__feature-col" /><col /><col /></colgroup>
              <thead>
                <tr><th scope="col">What matters</th><th scope="col">IndoDhobi</th><th scope="col">Other providers</th></tr>
              </thead>
              <tbody>
                {comparisons.map(({ feature, icon: Icon, indo, other }) => (
                  <tr key={feature}>
                    <th scope="row"><span className="home-comparison__feature"><span className="home-comparison__icon"><Icon size={20} aria-hidden="true" /></span>{feature}</span></th>
                    <td><span className="home-comparison__benefit"><CheckCircle2 size={20} aria-hidden="true" /><span>{indo}</span></span></td>
                    <td>{other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="home-comparison__action"><Link to="/pricing">Explore our services <ArrowRight size={18} aria-hidden="true" /></Link></p>
        </div>
      </section>

      {/* CUSTOMER TESTIMONIALS */}
      <section className="home-trust home-reviews" aria-labelledby="reviews-heading">
        <div className="home-trust__shell">
          <header className="home-trust__header">
            <p className="home-trust__eyebrow">Customer stories</p>
            <h2 id="reviews-heading">Fresh clothes. <span>Happy customers.</span></h2>
            <p>Everyday care, in our customers’ words.</p>
          </header>
          <div className="home-reviews__grid">
            {testimonials.map((review, index) => (
              <figure key={review.name} className={`home-review home-review--${index + 1}`}>
                <div className="home-review__top">
                  <span className="home-review__stars" role="img" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: review.rating }, (_, star) => <Star key={star} size={17} fill="currentColor" aria-hidden="true" />)}
                  </span>
                  <Quote size={28} fill="currentColor" aria-hidden="true" />
                </div>
                <blockquote>{review.comment}</blockquote>
                <figcaption>
                  <span className="home-review__avatar" aria-hidden="true">{review.name.split(' ').map(part => part[0]).join('')}</span>
                  <div><p className="home-review__name">{review.name}</p><p className="home-review__role">{review.role}</p></div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* OPERATIONAL HUBS & SERVICE AREAS */}
      <section id="operational-areas" className="service-areas" aria-labelledby="service-areas-heading">
        <div className="service-areas__shell">
          <header className="service-areas__header">
            <div>
              <p className="service-areas__eyebrow">Service areas</p>
              <h2 id="service-areas-heading">Fresh care. <span>Close to home.</span></h2>
              <p className="service-areas__intro">Explore our service areas and check pickup availability at your address.</p>
            </div>
            <Link to="/operational-areas" className="service-areas__check">
              Check your pincode <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </header>
          <div className="service-areas__grid">
            {serviceAreas.map(hub => (
              <article key={hub.city} className="service-area">
                <span className="service-area__badge">{hub.badge}</span>
                <h3><Building2 size={24} aria-hidden="true" /><span>{hub.city}</span></h3>
                <p className="service-area__locations">{hub.areas}</p>
                <p className="service-area__pincodes"><strong>Pincodes:</strong> {hub.pincodes}</p>
                <p className="service-area__hours"><CheckCircle2 size={18} aria-hidden="true" /><span>Daily · 7 AM–9 PM</span></p>
              </article>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
};

export default HomePageSections;
