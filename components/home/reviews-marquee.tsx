"use client";

const reviews = [
  {
    name: "Adrian Pereira Lopez",
    product: "Life · Vol. 1",
    rating: 5,
    text: "High quality resolution images, good service",
    initials: "AP",
    timeAgo: "2 weeks ago",
  },
  {
    name: "Albert Jap",
    product: "Noir · Vol. 1",
    rating: 5,
    text: "amazing design and quality",
    initials: "AJ",
    timeAgo: "3 weeks ago",
  },
  {
    name: "Daniel Rechten",
    product: "Wealth · Vol. 1",
    rating: 5,
    text: "Very nice pictures, very aesthetic and worth the money!!",
    initials: "DR",
    timeAgo: "1 month ago",
  },
  {
    name: "Sitanshu",
    product: "Life · Vol. 1",
    rating: 5,
    text: "Beautiful details and looks perfect on my laptop.",
    initials: "SB",
    timeAgo: "1 month ago",
  },
  {
    name: "HAMAD",
    product: "Wealth · Vol. 1",
    rating: 5,
    text: "Best digital wallpapers I've ever purchased. The brushstrokes are unbelievable.",
    initials: "HA",
    timeAgo: "1 month ago",
  },
  {
    name: "robin",
    product: "Shop Review",
    rating: 5,
    text: "The impasto texture looks stunning on my OLED display.",
    initials: "RB",
    timeAgo: "1 month ago",
  },
];

export function ReviewsMarquee() {
  return (
    <section className="akiyo-reviews-section">
      <div className="akiyo-reviews-header">
        <h2>Trusted by 2,400+ customers</h2>
        <p className="akiyo-reviews-rating">
          <span className="akiyo-stars" aria-label="5 stars">
            ★★★★★
          </span>{" "}
          <strong>4.8</strong> average rating
        </p>
      </div>

      <div className="akiyo-reviews-marquee-wrap">
        <div className="akiyo-reviews-track">
          {[...reviews, ...reviews].map((review, i) => (
            <article key={`${review.name}-${i}`} className="akiyo-review-card">
              <div className="akiyo-review-stars">★★★★★</div>
              <p className="akiyo-review-text">&ldquo;{review.text}&rdquo;</p>
              <div className="akiyo-review-author">
                <div className="akiyo-review-avatar">{review.initials}</div>
                <div className="akiyo-review-meta">
                  <strong>{review.name}</strong>
                  <span>Verified Buyer · {review.product}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Trust & Verified ticker */}
      <div className="akiyo-reviews-ticker" aria-hidden="true">
        <div className="akiyo-reviews-ticker-inner">
          {reviews.map((r, i) => (
            <span key={i} className="akiyo-ticker-item">
              <i className="akiyo-ticker-dot" />
              <strong>{r.name}</strong> left a 5-star review for {r.product}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
