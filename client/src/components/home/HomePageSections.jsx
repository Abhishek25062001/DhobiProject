import ManagedImage from '../ManagedImage';
import ContentIcon from '../ContentIcon';
import { visibleContentItems } from '../../../../shared/contentSchema.mjs';
import { serviceFromPrice } from '../../../../shared/pricing.mjs';
import { formatRupees } from './homepageCatalog';
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

const HomePageSections = ({ section, text, garments, config, coverage }) => {
  const content = section.content;
  const services = section.key === 'services' ? visibleContentItems(content.items).map(item => ({ ...item, price: serviceFromPrice(garments, config, item.service, item.ironing) })) : [];
  const comparisons = section.key === 'comparison' ? visibleContentItems(content.items) : [];
  const testimonials = section.key === 'testimonials' ? visibleContentItems(content.items) : [];

  const serviceAreas = coverage.areas;

  return (
    <>
      
      {/* SERVICES OVERVIEW */}
      {section.key === 'services' && <section className="garment-services" aria-labelledby="garment-services-heading">
        <div className="garment-services__shell">
          <header className="garment-services__header">
            <p className="garment-services__eyebrow">{text(content.eyebrow)}</p>
            <h2 id="garment-services-heading">{text(content.plain)} <span>{text(content.accent)}</span></h2>
            <p className="garment-services__intro">
              {text(content.intro)}
            </p>
          </header>
          <div className="garment-services__grid">
            {services.map((service) => (
              <article
                key={service.id}
                className={`garment-service${service.badge ? ' garment-service--featured' : ''}`}
              >
                {service.badge && <span className="garment-service__badge">{text(service.badge)}</span>}
                <div className="garment-service__visual">
                  <ManagedImage optional reference={service.image} width="1254" height="1254" />
                </div>
                <div className="garment-service__copy">
                  <h3>{text(service.title)}</h3>
                  <p>{text(service.description)}</p>
                </div>
                <footer className="garment-service__footer">
                  <p className="garment-service__price">{service.price === null ? text(content.unavailableText) : `${text(content.pricePrefix)} ${formatRupees(service.price)} ${text(content.priceUnit)}`}</p>
                  {service.price !== null && <Link
                    to="/book"
                    className="garment-service__book"
                    aria-label={`Book ${service.title}`}
                  >
                    {text(content.actionLabel)} <ArrowRight size={19} aria-hidden="true" />
                  </Link>}
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>}

      {/* COMPARISON */}
      {section.key === 'comparison' && <section className="home-trust home-comparison" aria-labelledby="comparison-heading">
        <div className="home-trust__shell">
          <header className="home-trust__header">
            <p className="home-trust__eyebrow">{text(content.eyebrow)}</p>
            <h2 id="comparison-heading">{text(content.plain)} <span>{text(content.accent)}</span></h2>
            <p>{text(content.intro)}</p>
          </header>
          <p className="home-comparison__scroll-hint" id="comparison-scroll-hint">{text(content.scrollHint)}</p>
          <div aria-describedby="comparison-scroll-hint" className="home-comparison__table-wrap" role="region" aria-label="Laundry service comparison" tabIndex={0}>
            <table className="home-comparison__table">
              <caption className="sr-only">{text(content.caption)}</caption>
              <colgroup><col className="home-comparison__feature-col" /><col /><col /></colgroup>
              <thead>
                <tr><th scope="col">{text(content.firstColumn)}</th><th scope="col">{text(content.ownColumn)}</th><th scope="col">{text(content.otherColumn)}</th></tr>
              </thead>
              <tbody>
                {comparisons.map(({ id, feature, icon, own, other }) => (
                  <tr key={id}>
                    <th scope="row"><span className="home-comparison__feature"><span className="home-comparison__icon"><ContentIcon name={icon} size={20} aria-hidden="true" /></span>{text(feature)}</span></th>
                    <td><span className="home-comparison__benefit"><CheckCircle2 size={20} aria-hidden="true" /><span>{text(own)}</span></span></td>
                    <td>{text(other)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="home-comparison__action"><Link to={content.actionHref || "/pricing"}>{text(content.actionLabel)} <ArrowRight size={18} aria-hidden="true" /></Link></p>
        </div>
      </section>}

      {/* CUSTOMER TESTIMONIALS */}
      {section.key === 'testimonials' && <section className="home-trust home-reviews" aria-labelledby="reviews-heading">
        <div className="home-trust__shell">
          <header className="home-trust__header">
            <p className="home-trust__eyebrow">{text(content.eyebrow)}</p>
            <h2 id="reviews-heading">{text(content.plain)} <span>{text(content.accent)}</span></h2>
            <p>{text(content.intro)}</p>
          </header>
          <div className="home-reviews__grid">
            {testimonials.map((review, index) => (
              <figure key={review.id} className={`home-review home-review--${index + 1}`}>
                <div className="home-review__top">
                  <span className="home-review__stars" role="img" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: review.rating }, (_, star) => <Star key={star} size={17} fill="currentColor" aria-hidden="true" />)}
                  </span>
                  <Quote size={28} fill="currentColor" aria-hidden="true" />
                </div>
                <blockquote>{text(review.comment)}</blockquote>
                <figcaption>
                  <span className="home-review__avatar" aria-hidden="true">{review.avatar ? <ManagedImage optional reference={review.avatar} className="w-full h-full rounded-full object-cover" /> : review.name.split(' ').map(part => part[0]).join('')}</span>
                  <div><p className="home-review__name">{text(review.name)}</p><p className="home-review__role">{text(review.role)}</p></div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>}

      {/* OPERATIONAL HUBS & SERVICE AREAS */}
      {section.key === 'areas' && <section id="operational-areas" className="service-areas" aria-labelledby="service-areas-heading">
        <div className="service-areas__shell">
          <header className="service-areas__header">
            <div>
              <p className="service-areas__eyebrow">{text(content.eyebrow)}</p>
              <h2 id="service-areas-heading">{text(content.plain)} <span>{text(content.accent)}</span></h2>
              <p className="service-areas__intro">{text(content.intro)}</p>
            </div>
            <Link to={content.actionHref || "/operational-areas"} className="service-areas__check">
              {text(content.actionLabel)} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </header>
          {coverage.error && <button type="button" onClick={coverage.retry}>Service areas could not be loaded. Try again.</button>}
          <div className="service-areas__grid">
            {serviceAreas.map(hub => (
              <article key={hub._id} className="service-area">
                <span className="service-area__badge">{hub.homeBadge}</span>
                <h3><Building2 size={24} aria-hidden="true" /><span>{hub.shortName}</span></h3>
                <p className="service-area__locations">{hub.summary}</p>
                <p className="service-area__pincodes"><strong>Pincodes:</strong> {hub.pincodeRange.replace(/ - /g, "–")}</p>
                <p className="service-area__hours"><CheckCircle2 size={18} aria-hidden="true" /><span>{hub.hours}</span></p>
              </article>
            ))}
          </div>
        </div>
      </section>}


    </>
  );
};

export default HomePageSections;
