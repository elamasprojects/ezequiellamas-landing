export default function Footer() {
  return (
    <footer>
      <div className="footer-left">
        <span>Ezequiel Lamas</span> — Buenos Aires, Argentina
      </div>
      <div className="footer-links">
        <a href="https://tryugcstudio.com" target="_blank" rel="noreferrer">
          UGC Studio
        </a>
        <a href="https://advantx.co" target="_blank" rel="noreferrer">
          AdvantX
        </a>
        <a
          href="https://www.linkedin.com/in/ezequiel-lamas-ab5568256/"
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn
        </a>
        <a href="https://x.com/chessinvesting" target="_blank" rel="noreferrer">
          Twitter / X
        </a>
        <a
          href="https://www.instagram.com/ezequiellamas.ia/"
          target="_blank"
          rel="noreferrer"
        >
          Instagram
        </a>
        <a href="https://www.youtube.com/@ezequiellamass" target="_blank" rel="noreferrer">
          YouTube
        </a>
      </div>
      <div
        style={{
          width: "100%",
          marginTop: "1rem",
          display: "flex",
          gap: "2rem",
          flexWrap: "wrap",
        }}
      >
        <a
          href="https://wa.me/5491157388695"
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem",
            color: "var(--ll-accent)",
            textDecoration: "none",
            letterSpacing: "0.05em",
          }}
        >
          📱 +54 9 11 5738-8695
        </a>
        <a
          href="https://mail.google.com/mail/?view=cm&to=ezequiellamas@tryugcstudio.com"
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem",
            color: "var(--ll-accent)",
            textDecoration: "none",
            letterSpacing: "0.05em",
          }}
        >
          ✉ ezequiellamas@tryugcstudio.com
        </a>
      </div>
    </footer>
  );
}
