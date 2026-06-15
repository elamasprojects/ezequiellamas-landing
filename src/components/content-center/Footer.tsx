import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="cc-footer">
      <div className="cc-footer-left">
        Content <b>Center</b> — por Ezequiel Lamas
      </div>
      <div className="cc-footer-links">
        <a href="#waitlist">Lista de espera</a>
        <Link to="/content-center/features">Todas las features</Link>
        <a href="https://ezequiellamas.com">ezequiellamas.com</a>
        <a href="https://www.instagram.com/ezequiellamass/" target="_blank" rel="noreferrer">
          Instagram
        </a>
      </div>
    </footer>
  );
}
