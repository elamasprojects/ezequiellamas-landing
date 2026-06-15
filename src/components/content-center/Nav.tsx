import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Nav() {
  return (
    <motion.nav
      className="cc-nav"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Link className="cc-nav-brand" to="/content-center">
        <span className="cc-nav-dot" aria-hidden="true" />
        Content <b>Center</b>
      </Link>
      <div className="cc-nav-actions">
        <a className="cc-nav-back" href="https://ezequiellamas.com">
          ← ezequiellamas.com
        </a>
        <a className="cc-btn cc-btn-primary" href="#waitlist">
          Sumarme a la lista
        </a>
      </div>
    </motion.nav>
  );
}
