import React from "react";
import ShortDescriptoin from "./Components/ShortDescriptoin";
import Education from "./Components/Education";
import CalenderWithTime from "./Components/CalendarWithTime";
import Skills from "./Components/Skills";
import PersonalDetails from "./Components/PersonalDetails";
import Contact from "./Components/Contact";
import Footer from "./Components/Footer";

function Home() {
  return (
    <div>
      <h1 className="pt-40 sm:px-0 bg-gradient-to-r from-primaryColor1 to-primaryColor5 dark:bg-gradient-to-r dark:from-dPrimaryColor4 dark:to-dPrimaryColor5  z-0"></h1>
      <div className="mx-5 sm:mx-20 absolute inset-0 z-0 mt-20">
        <div className="sm:flex">
          <div className="sm:w-2/3">
            <ShortDescriptoin />
            <Education />
          </div>
          <div className="sm:w-1/3">
            <CalenderWithTime />
            <Skills />
          </div>
        </div>
        <div>
          <PersonalDetails />
        </div>
        <div>
          <Contact />
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default Home;
