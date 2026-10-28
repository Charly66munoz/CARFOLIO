import { useState } from 'react'
import catPhoto from '../../assets/about-cards/CAT.webp'
import rallyPhoto from '../../assets/about-cards/RALLY.webp'
import guitarPhoto from '../../assets/about-cards/GUITTAR.webp'
import travelPhoto from '../../assets/about-cards/TRAVEL.webp'

const INTERESTS = [
  {
    title: "Sports & Motorsport",
    description:
      "I'm passionate about sports, especially football, Formula 1, and rally racing.",
    image: rallyPhoto,
    imagePosition: "50% 48%",
  },
  {
    title: "Music",
    description:
      "I love international rock! I have MTV and some video games from my childhood to thank for that.",
    image: guitarPhoto,
    imagePosition: "40% 45%",
  },
  {
    title: "Travel",
    description:
      "I love traveling and learning about new cultures, trying new foods, unwinding, and not having to do laundry",
    image: travelPhoto,
    imagePosition: "35% 50%",
  },
  {
    title: "Cats",
    description:
      "If in an interview some ask me which are my weaknesses are, I'll say cats!'",
    image: catPhoto,
    imagePosition: "50% 42%",
  },
];

export function AboutSection() {
  const [portraitUnavailable, setPortraitUnavailable] = useState(false)

  return (
    <section className="about-section" aria-labelledby="destination-heading">
      <header className="about-hero">
        <div className="about-intro">
          <p className="about-eyebrow">ABOUT </p>
          <h2 id="destination-heading" tabIndex={-1}>
            More than code.
          </h2>
          <p className="about-subtitle">A journey of growth and discovery.</p>
          <span className="about-accent" aria-hidden="true" />
        </div>
        <div
          className="about-portrait"
          aria-hidden={portraitUnavailable || undefined}
        >
          {!portraitUnavailable && (
            <img
              src={`${import.meta.env.BASE_URL}images/about/agustin-lopez-portrait.webp`}
              alt="Portrait of Agustín López"
              width="620"
              height="800"
              decoding="async"
              onError={() => setPortraitUnavailable(true)}
            />
          )}
        </div>
      </header>
      <section className="about-story" aria-labelledby="about-story-heading">
        <h3 id="about-story-heading">My Story</h3>
        <div className="about-story-copy">
          <p>
            A few years ago, at just 20 years old, I found myself uncertain
            about my professional future. I wasn't sure which direction to take
            or what I wanted to build my career around.
          </p>
          <p>
            Then came one of the most important opportunities of my life: moving
            to Europe.
          </p>
          <p>
            My journey took me through Italy and Germany before eventually
            bringing me to Spain. It was there that I found more than just a
            place to live. Spain became my second home, giving me the
            opportunity to study while working and discover new possibilities
            for my future.
          </p>
          <p>
            Today, I'm ready for another challenge: growing as a software
            developer, contributing to meaningful projects, and becoming part of
            a team that encourages me to keep learning and improving.
          </p>
        </div>
      </section>
      <section
        className="about-interests"
        aria-labelledby="about-interests-heading"
      >
        <h3 id="about-interests-heading">Beyond the code.</h3>
        <ol className="about-interest-list">
          {INTERESTS.map((interest,) => (
            <li className="about-interest" key={interest.title} tabIndex={0}>
              <img
                className="about-interest-image"
                src={interest.image}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                style={{ objectPosition: interest.imagePosition }}
              />
              <div className="about-interest-copy">
                
                <h4>{interest.title}</h4>
                <p>{interest.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
