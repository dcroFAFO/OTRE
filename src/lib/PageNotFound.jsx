import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

export default function PageNotFound() {
  const location = useLocation();
  const { data: { business } } = usePlatformConfig();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title={`Page Not Found | ${business.name}`} description={`The requested ${business.name} page could not be found.`} canonical={location.pathname} noindex />
      <LandingNav />
      <main id="main-content" className="grid min-h-[70vh] place-items-center px-5 pb-16 pt-32 text-center">
        <div className="max-w-lg">
          <p className="font-heading text-6xl font-extrabold text-primary" aria-hidden="true">404</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold">That page is not available</h1>
          <p className="mt-3 text-muted-foreground">The link may be old or the address may have been entered incorrectly.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg"><Link to="/"><Home className="mr-2 h-4 w-4" aria-hidden="true" />Home</Link></Button>
            <Button type="button" variant="outline" size="lg" onClick={() => window.history.back()}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Go back</Button>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
