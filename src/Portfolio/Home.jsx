import React, { useEffect, useState } from "react";
import NavigationBar from "./Components/NavigationBar";
import HomeDetailsSection from "./Components/HomeDetailsSection";
import About from "./Components/About";
import { useLocation } from "react-router-dom";

function Home() {
  const location = useLocation();
  const [id, setId] = useState(location?.state?.id || "");

  const scrollToTarget = (id) => {
    const targetElement = document.getElementById(id);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (id) {
      scrollToTarget(id);
    }
  }, [id]);

  return (
    <div className="">
      <div className=" overflow-clip  text-black dark:text-white font-poppins">
        <section id="home">
          <div className="h-screen ">
            <HomeDetailsSection />
          </div>
        </section>
        <section id="about">
          <div className="sm:h-screen ">
            <About />
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
