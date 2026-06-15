import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { reveal } from "./motion";
import { IntegrationGlyph, type BrandKey } from "./IntegrationLogos";
import { useJoinWaitlist } from "@/hooks/useJoinWaitlist";

const PLATFORMS: { key: string; brand: BrandKey; label: string }[] = [
  { key: "instagram", brand: "instagram", label: "Instagram" },
  { key: "youtube", brand: "youtube", label: "YouTube" },
  { key: "tiktok", brand: "tiktok", label: "TikTok" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [platforms, setPlatforms] = useState<string[]>([]);
  const join = useJoinWaitlist();

  const togglePlatform = (key: string) =>
    setPlatforms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Ingresá un email válido.");
      return;
    }
    join.mutate(
      { email: email.trim(), name: name.trim() || undefined, platforms, website },
      {
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const done = join.isSuccess;
  const already = join.data?.already;

  return (
    <section className="cc-waitlist" id="waitlist">
      <div className="cc-shell">
        <motion.div
          className="cc-waitlist-card"
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={reveal.viewport}
          transition={reveal.transition}
        >
          {done ? (
            <div className="cc-waitlist-success">
              <div className="cc-success-mark" aria-hidden="true">
                ✓
              </div>
              <h2 className="cc-success-title">
                {already ? "Ya estabas en la lista" : "Listo, estás adentro"}
              </h2>
              <p className="cc-success-body">
                {already
                  ? "Tu email ya estaba anotado. Te aviso apenas Content Center se abra al público."
                  : "Te mandé un mail de confirmación. Te voy a avisar cuando Content Center se abra al público, y te iré pasando novedades — sin spam y sin prometerte fechas."}
              </p>
            </div>
          ) : (
            <>
              <div className="cc-eyebrow" style={{ textAlign: "center" }}>
                Lista de espera privada
              </div>
              <h2 className="cc-h2">
                Sumate a la <em>lista</em>
              </h2>
              <p className="cc-waitlist-note">
                Content Center todavía no es público — lo uso yo, todos los días. Dejá tu email y te
                aviso cuando lo abra. Mientras tanto, novedades de vez en cuando.
              </p>

              <form className="cc-form" onSubmit={onSubmit} noValidate>
                {/* honeypot */}
                <div className="cc-hp" aria-hidden="true">
                  <label htmlFor="cc-website">No completar</label>
                  <input
                    id="cc-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div>
                  <label className="cc-field-label" htmlFor="cc-name">
                    Nombre <span style={{ textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
                  </label>
                  <input
                    id="cc-name"
                    className="cc-input"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={join.isPending}
                  />
                </div>

                <div>
                  <label className="cc-field-label" htmlFor="cc-email">
                    Email
                  </label>
                  <input
                    id="cc-email"
                    className="cc-input"
                    type="email"
                    inputMode="email"
                    placeholder="vos@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={join.isPending}
                  />
                </div>

                <div>
                  <label className="cc-field-label">¿En qué plataformas creás? (opcional)</label>
                  <div className="cc-platforms">
                    {PLATFORMS.map((p) => (
                      <button
                        type="button"
                        key={p.key}
                        className="cc-platform-toggle"
                        data-active={platforms.includes(p.key)}
                        onClick={() => togglePlatform(p.key)}
                        disabled={join.isPending}
                      >
                        <IntegrationGlyph brand={p.brand} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="cc-btn cc-btn-primary" disabled={join.isPending}>
                  {join.isPending ? "Sumándote…" : "Avisarme cuando esté disponible"}
                </button>
                <p className="cc-form-fine">Sin spam. Te podés bajar cuando quieras.</p>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
