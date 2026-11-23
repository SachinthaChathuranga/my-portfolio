import React, { Suspense, lazy, useEffect, useState } from "react";
import AmbientCorridor3D from "./components/AmbientCorridor3D";
import Preloader3D from "./components/Preloader3D";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import WorkSection from "./components/WorkSection";
import CapabilitiesSection from "./components/CapabilitiesSection";
import JourneySection from "./components/JourneySection";
import GallerySection from "./components/GallerySection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import ProjectModal from "./components/ProjectModal";
import StorePreviewModal from "./components/StorePreviewModal";
import WorkArchivePage from "./pages/WorkArchivePage";
import GalleryArchivePage from "./pages/GalleryArchivePage";
import { assetUrl, fetchPortfolioData, IS_LOCAL_STUDIO } from "./utils/portfolioApi";

// Strictly lazy-loaded ONLY in local dev; completely tree-shaken in production GitHub Pages builds
const LocalStudioDashboard = IS_LOCAL_STUDIO
  ? lazy(() => import("./studio/LocalStudioDashboard"))
  : null;

function parseHashRoute() {
  const raw = window.location.hash || "";
  if (raw.startsWith("#/work")) {
    const query = raw.split("?")[1] || "";
    const params = new URLSearchParams(query);
    return { page: "work", category: params.get("category") || "all" };
  }
  if (raw.startsWith("#/gallery")) {
    const query = raw.split("?")[1] || "";
    const params = new URLSearchParams(query);
    return { page: "gallery", filter: params.get("filter") || "all" };
  }
  if (IS_LOCAL_STUDIO && raw.startsWith("#/studio")) {
    return { page: "studio" };
  }
  return { page: "home" };
}

export default function App() {
  const [portfolio, setPortfolio] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [storePreview, setStorePreview] = useState(null);

  const [route, setRoute] = useState(() => parseHashRoute());
  const [studioProjectId, setStudioProjectId] = useState(null);

  useEffect(() => {
    let active = true;
    fetchPortfolioData()
      .then((data) => {
        if (!active) return;
        setPortfolio(data);
        const heroImg = new Image();
        heroImg.src = assetUrl(
          data?.profile?.portraits?.hero || "images/portraits/hero-corridor.png"
        );
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err?.message || "Could not load portfolio data.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigateHome = (sectionId = null) => {
    setSelectedProject(null);
    setStorePreview(null);
    if (window.location.hash.startsWith("#/")) {
      window.location.hash = "";
    }
    setRoute({ page: "home" });
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const navigateWork = (category = "all") => {
    setSelectedProject(null);
    setStorePreview(null);
    const hash = category && category !== "all" ? `#/work?category=${encodeURIComponent(category)}` : "#/work";
    window.location.hash = hash;
    setRoute({ page: "work", category });
  };

  const navigateGallery = (filter = "all") => {
    setSelectedProject(null);
    setStorePreview(null);
    const hash = filter && filter !== "all" ? `#/gallery?filter=${encodeURIComponent(filter)}` : "#/gallery";
    window.location.hash = hash;
    setRoute({ page: "gallery", filter });
  };

  const openStudio = (projectId = null) => {
    if (!IS_LOCAL_STUDIO) return;
    setSelectedProject(null);
    setStorePreview(null);
    setStudioProjectId(projectId);
    window.location.hash = "#/studio";
    setRoute({ page: "studio" });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const exitStudio = () => {
    setStudioProjectId(null);
    navigateHome();
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06040D] p-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[#120D24] p-8">
          <h1 className="font-display text-2xl font-bold">Unable to Load Portfolio</h1>
          <p className="mt-2 text-sm text-ink-secondary">{loadError}</p>
        </div>
      </div>
    );
  }

  // Dev-only Local Studio Dashboard View
  if (IS_LOCAL_STUDIO && route.page === "studio" && portfolio && LocalStudioDashboard) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#06040D] font-mono text-xs text-ink-secondary">
            Opening Local Studio...
          </div>
        }
      >
        <LocalStudioDashboard
          data={portfolio}
          initialProjectId={studioProjectId}
          onDataSaved={(updated) => setPortfolio(updated)}
          onExitStudio={exitStudio}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#06040D] text-[#F8F6FF]">
      {!preloaderDone && (
        <Preloader3D
          ready={Boolean(portfolio)}
          onComplete={() => setPreloaderDone(true)}
        />
      )}

      <AmbientCorridor3D />

      {portfolio && (
        <>
          <Navbar
            brand={portfolio.profile?.brand}
            activePage={route.page}
            onNavigateHome={navigateHome}
            onNavigateWork={() => navigateWork("all")}
            onNavigateGallery={() => navigateGallery("all")}
            onOpenStudio={IS_LOCAL_STUDIO ? () => openStudio(null) : undefined}
          />

          {route.page === "work" ? (
            <WorkArchivePage
              projects={portfolio.projects}
              initialCategory={route.category}
              onBackHome={() => navigateHome("work")}
              onSelectProject={(project) => setSelectedProject(project)}
              onOpenStorePreview={(project, store) =>
                setStorePreview({ project, store })
              }
            />
          ) : route.page === "gallery" ? (
            <GalleryArchivePage
              gallery={portfolio.gallery}
              initialFilter={route.filter}
              onBackHome={() => navigateHome("gallery")}
            />
          ) : (
            <main className="relative z-10">
              <HeroSection profile={portfolio.profile} />
              <AboutSection profile={portfolio.profile} />
              <WorkSection
                projects={portfolio.projects}
                previewLimit={3}
                onSelectProject={(project) => setSelectedProject(project)}
                onOpenStorePreview={(project, store) =>
                  setStorePreview({ project, store })
                }
                onNavigateWork={navigateWork}
              />
              <CapabilitiesSection skills={portfolio.skills} />
              <JourneySection
                experience={portfolio.experience}
                education={portfolio.education}
                references={portfolio.references}
                showReferences={portfolio.showReferences !== false}
              />
              <GallerySection
                gallery={portfolio.gallery}
                previewLimit={4}
                onNavigateGallery={navigateGallery}
              />
              <ContactSection profile={portfolio.profile} />
            </main>
          )}

          <Footer
            profile={portfolio.profile}
            onNavigateHome={navigateHome}
            onNavigateWork={() => navigateWork("all")}
            onNavigateGallery={() => navigateGallery("all")}
          />

          <ProjectModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onEditInStudio={
              IS_LOCAL_STUDIO ? (id) => openStudio(id) : undefined
            }
            onOpenStorePreview={(project, store) =>
              setStorePreview({ project, store })
            }
          />

          <StorePreviewModal
            project={storePreview?.project || null}
            initialStore={storePreview?.store || "playstore"}
            onClose={() => setStorePreview(null)}
          />
        </>
      )}
    </div>
  );
}
