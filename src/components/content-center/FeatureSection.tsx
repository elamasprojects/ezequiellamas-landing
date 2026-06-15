import { motion } from "framer-motion";
import { reveal } from "./motion";
import { IntegrationChip } from "./IntegrationLogos";
import type { ShowcaseFeature, FeatureMock } from "./featuresData";

function Mock({ mock }: { mock: FeatureMock }) {
  return (
    <div className="cc-feature-visual" aria-hidden="true">
      <div className="cc-mock-bar">
        <i />
        <i />
        <i />
        <span style={{ marginLeft: "0.4rem" }}>{mock.caption}</span>
      </div>
      {mock.rows.map((row, i) => (
        <div className="cc-mock-row" key={i}>
          <span>{row.label}</span>
          {row.pill && <span className={`cc-mock-pill${row.tone ? ` ${row.tone}` : ""}`}>{row.pill}</span>}
        </div>
      ))}
      {typeof mock.meter === "number" && (
        <div className="cc-mock-meter">
          <i style={{ width: `${mock.meter}%` }} />
        </div>
      )}
    </div>
  );
}

export default function FeatureSection({
  feature,
  reverse = false,
}: {
  feature: ShowcaseFeature;
  reverse?: boolean;
}) {
  return (
    <motion.div
      className={`cc-feature${reverse ? " reverse" : ""}`}
      initial={reveal.initial}
      whileInView={reveal.whileInView}
      viewport={reveal.viewport}
      transition={reveal.transition}
    >
      <div className="cc-feature-copy">
        <div className="cc-feature-index">{feature.index}</div>
        <h3>
          {feature.title}
          <em>{feature.em}</em>
          {feature.titleTail}
        </h3>
        <p>{feature.body}</p>
        <ul className="cc-feature-points">
          {feature.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="cc-chips">
          {feature.brands.map((b) => (
            <IntegrationChip brand={b} key={b} />
          ))}
        </div>
      </div>
      <Mock mock={feature.mock} />
    </motion.div>
  );
}
