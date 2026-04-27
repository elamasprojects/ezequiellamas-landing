import type {
  T1CoverContent,
  T2FeatureContent,
  T3GridContent,
  T4VSContent,
  T5CTAContent,
  CarouselTemplate,
} from "@/lib/carousel/types";
import T1CoverEditor from "./T1CoverEditor";
import T2FeatureEditor from "./T2FeatureEditor";
import T3GridEditor from "./T3GridEditor";
import T4VSEditor from "./T4VSEditor";
import T5CTAEditor from "./T5CTAEditor";

interface Props {
  template: CarouselTemplate;
  content: unknown;
  onChange: (next: unknown) => void;
}

/**
 * Discriminated-union dispatcher: picks the right editor based on template.
 */
export default function SlideEditor({ template, content, onChange }: Props) {
  switch (template) {
    case "T1Cover":
      return (
        <T1CoverEditor
          value={content as T1CoverContent}
          onChange={onChange as (n: T1CoverContent) => void}
        />
      );
    case "T2Feature":
      return (
        <T2FeatureEditor
          value={content as T2FeatureContent}
          onChange={onChange as (n: T2FeatureContent) => void}
        />
      );
    case "T3Grid":
      return (
        <T3GridEditor
          value={content as T3GridContent}
          onChange={onChange as (n: T3GridContent) => void}
        />
      );
    case "T4VS":
      return (
        <T4VSEditor
          value={content as T4VSContent}
          onChange={onChange as (n: T4VSContent) => void}
        />
      );
    case "T5CTA":
      return (
        <T5CTAEditor
          value={content as T5CTAContent}
          onChange={onChange as (n: T5CTAContent) => void}
        />
      );
  }
}
