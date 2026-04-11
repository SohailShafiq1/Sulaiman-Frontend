import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer-content">
        <a 
          href="https://wa.me/923408432739?text=Hello%20there!" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="footer-link"
        >
          Developed by Sohail Shafiq @2026
        </a>
      </div>
    </footer>
  );
};

export default Footer;
