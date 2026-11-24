import React, { Suspense, lazy, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
import BlogPage from "./pages/BlogPage";
import StudioAuthGate from "./studio/StudioAuthGate";
import { auth } from "./utils/firebase";
import { assetUrl, fetchPortfolioData } from "./utils/portfolioApi";

const LocalStudioDashboard = lazy(() => import("./studio/LocalStudioDashboard"));

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
  if (raw.startsWith("#/blog")) {
    const sub = raw.slice("#/blog".length).split("?")[0].replace(/^\/+/, "");
    return { page: "blog", postId: sub || null };
  }
  if (raw.startsWith("#/studio")) {
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
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

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
    const hash =
      category && category !== "all"
        ? `#/work?category=${encodeURIComponent(category)}`
        : "#/work";
    window.location.hash = hash;
    setRoute({ page: "work", category });
  };

  const navigateGallery = (filter = "all") => {
    setSelectedProject(null);
    setStorePreview(null);
    const hash =
      filter && filter !== "all"
        ? `#/gallery?filter=${encodeURIComponent(filter)}`
        : "#/gallery";
    window.location.hash = hash;
    setRoute({ page: "gallery", filter });
  };

  const navigateBlog = (postId = null) => {
    setSelectedProject(null);
    setStorePreview(null);
    window.location.hash = postId ? `#/blog/${encodeURIComponent(postId)}` : "#/blog";
    setRoute({ page: "blog", postId });
  };

  const openStudio = (projectId = null) => {
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

  const handleSignOut = async () => {
    await signOut(auth);
    exitStudio();
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

  // Protected Cloud Studio View (Available on live site & locally via #/studio)
  if (route.page === "studio") {
    if (!authChecked || !portfolio) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#06040D] font-mono text-xs text-ink-secondary">
          Checking Cloud Studio session...
        </div>
      );
    }

    if (!authUser) {
      return <StudioAuthGate onBack={exitStudio} />;
    }

    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#06040D] font-mono text-xs text-ink-secondary">
            Opening SMSC Cloud Studio...
          </div>
        }
      >
        <LocalStudioDashboard
          data={portfolio}
          authUser={authUser}
          initialProjectId={studioProjectId}
          onDataSaved={(updated) => setPortfolio(updated)}
          onExitStudio={exitStudio}
          onSignOut={handleSignOut}
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
            onNavigateBlog={() => navigateBlog(null)}
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
          ) : route.page === "blog" ? (
            <BlogPage
              blogs={portfolio.blogs || []}
              activePostId={route.postId}
              onSelectPost={(id) => navigateBlog(id)}
              onBackToBlogList={() => navigateBlog(null)}
              onBackHome={() => navigateHome(null)}
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
            onNavigateBlog={() => navigateBlog(null)}
            onOpenStudio={() => openStudio(null)}
          />

          <ProjectModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onEditInStudio={authUser ? (id) => openStudio(id) : undefined}
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
