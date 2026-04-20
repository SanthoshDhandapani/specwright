import { HeroSection } from "@/components/sections/hero";
import { ThreeWaysSection } from "@/components/sections/three-ways";
import { DesktopShowcaseSection } from "@/components/sections/desktop-showcase";
import { PipelineSection } from "@/components/sections/pipeline-section";
import { CodeShowcaseSection } from "@/components/sections/code-showcase";
import { QualityScoreSection } from "@/components/sections/quality-score";
import { ComparisonSection } from "@/components/sections/comparison";
import { QuickStartSection } from "@/components/sections/quick-start";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <ThreeWaysSection />
      <DesktopShowcaseSection />
      <PipelineSection />
      <CodeShowcaseSection />
      <QualityScoreSection />
      <ComparisonSection />
      <QuickStartSection />
      <Footer />
    </main>
  );
}
