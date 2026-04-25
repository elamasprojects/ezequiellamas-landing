import { useEffect } from "react";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Filosofia from "@/components/landing/Filosofia";
import Historia from "@/components/landing/Historia";
import Recorrido from "@/components/landing/Recorrido";
import Logros from "@/components/landing/Logros";
import Vision from "@/components/landing/Vision";
import Marquee from "@/components/landing/Marquee";
import Footer from "@/components/landing/Footer";
import { useFadeIn } from "@/hooks/useFadeIn";

export default function Landing() {
  useFadeIn();

  useEffect(() => {
    document.body.classList.add("landing");
    return () => document.body.classList.remove("landing");
  }, []);

  return (
    <>
      <Nav />
      <Hero />
      <Filosofia />
      <Historia />
      <Recorrido />
      <Logros />
      <Vision />
      <Marquee />
      <Footer />
    </>
  );
}
