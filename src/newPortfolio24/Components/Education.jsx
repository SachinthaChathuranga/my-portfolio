import React, { useEffect } from "react";
import "aos/dist/aos.css"; // Import AOS CSS
import AOS from "aos";

function Education() {

  useEffect(() => {
    AOS.init({
      duration: 1000, // Customize duration of the animation (optional)
      easing: "ease-in-out", // Customize easing function (optional)
      once: true, // Whether to animate only once (optional)
    });
  }, []);

  return (
    <div className="h-fit w-full  font-poppins " data-aos="fade-up" data-aos-duration="2000" data-aos-delay="500">
      <div className="m-1 overflow-hidden  p-5  shadow-lg rounded-lg bg-primaryColor9 dark:bg-dPrimaryColor8 text-primaryColor1 dark:text-dPrimaryColor4">
        <h1 className="text-3xl font-serif font-bold text-primaryColor2 dark:text-dPrimaryColor1 animate-pulse">
          Education
        </h1>

        <div className="px-5 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xl font-medium ">BSc Hons (Computer Science)</p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium ">
              Sep 2022 - Present
            </p>
          </div>
          <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium ">
            University of Jaffna
          </p>
          <p>Current Cumulative GPA - 3.22 out of 4.00</p>
        </div>

        <div className="px-5 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xl font-medium ">Passed GCE A/L</p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium ">
              Aug 2019
            </p>
          </div>
          <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium ">
            Ch/ Senanayake National School, Madampe
          </p>
          <p>Results - BCC (Physical Science stream) , Z-Score - 1.0067</p>
        </div>

        <div className="px-5 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xl font-medium ">Passed GCE O/L</p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium ">
              Dec 2016
            </p>
          </div>
          <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium ">
            Ch/ Senanayake National School, Madampe
          </p>
          <p>Results - 7A & 2C</p>
        </div>
      </div>
    </div>
  );
}

export default Education;
