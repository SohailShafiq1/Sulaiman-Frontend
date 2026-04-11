import React, { useState, useEffect, useMemo } from 'react';
import '../styles/Banner.css';
import img1 from '../assets/img1.jpg';
import img2 from '../assets/img2.jpg';

const Banner = ({ posters }) => {
  const hardcodedDefaults = useMemo(() => [img1, img2], []);
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchDefaultPosters = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings/defaultPosters`);
        if (response.ok) {
          const data = await response.json();
          if (data.value && data.value.length > 0) {
            setImages(data.value);
            return;
          }
        }
        setImages(hardcodedDefaults);
      } catch (error) {
        console.error('Error fetching default posters:', error);
        setImages(hardcodedDefaults);
      }
    };

    if (posters && posters.length > 0) {
      setImages(posters);
    } else {
      fetchDefaultPosters();
    }
  }, [posters, hardcodedDefaults]);

  // Reset index when images change (e.g. switching tournaments)
  const [prevLength, setPrevLength] = useState(images.length);
  if (images.length !== prevLength) {
    setPrevLength(images.length);
    setCurrentIndex(0);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="banner">
      <div className="banner-content">
        <img loading="lazy" src={images[currentIndex]} alt={`Slide ${currentIndex + 1}`} className="banner-image" />
        <div className="overlay-controls">
          <span className="arrow prev" onClick={() => setCurrentIndex((currentIndex - 1 + images.length) % images.length)}>&lt;</span>
          <div className="dots">
            {images.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              ></span>
            ))}
          </div>
          <span className="arrow next" onClick={() => setCurrentIndex((currentIndex + 1) % images.length)}>&gt;</span>
        </div>
      </div>
    </div>
  );
};

export default Banner;
