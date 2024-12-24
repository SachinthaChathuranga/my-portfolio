import React, { useEffect } from "react";
import me from "../assests/dcssmsc.jpg";
import "aos/dist/aos.css"; // Import AOS CSS
import AOS from "aos";

const singleRowStyle = "flex items-center justify-between border-b-2 border-primaryColor1 dark:border-dPrimaryColor5 mt-5"

function PersonalDetails() {
  useEffect(() => {
    AOS.init({
      duration: 1000, // Customize duration of the animation (optional)
      easing: "ease-in-out", // Customize easing function (optional)
      once: true, // Whether to animate only once (optional)
    });
  }, []);

  return (
    <div
      className="flex font-poppins mt-5  "
      data-aos="fade-up"
      data-aos-duration="1000"
      data-aos-delay="700"
    >
      <div className="h-[350px] w-1/3  animate-pulse ">
        <img src={me} alt="" className="w-full h-full object-cover rounded-lg " />
        <div className="h-[400px] w-full  m-auto mt-[-400px] rounded-full"></div>
      </div>
      <div className="w-2/3 px-5 items-center justify-center">
        <h1 className="text-3xl font-serif font-bold text-primaryColor2 dark:text-dPrimaryColor1 animate-pulse text-center">
          Personal Details
        </h1>

        <div className="px-5 py-5">
          <div className={singleRowStyle}>
            <p className="text-xl font-medium text-primaryColor1 dark:text-dPrimaryColor4 ">
              Name
            </p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium text-xl animate-pulse">
              S.M.S. Chathuranga
            </p>
          </div>

          <div className={singleRowStyle}>
            <p className="text-xl font-medium text-primaryColor1 dark:text-dPrimaryColor4 ">
              Birth Day
            </p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium text-xl animate-pulse">
              Dec 3, 2000
            </p>
          </div>

          <div className={singleRowStyle}>
            <p className="text-xl font-medium text-primaryColor1 dark:text-dPrimaryColor4 ">
              Address
            </p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium text-xl animate-pulse">
              Madampe Chilaw, SriLanka
            </p>
          </div>

          <div className={singleRowStyle}>
            <p className="text-xl font-medium text-primaryColor1 dark:text-dPrimaryColor4 ">
              Phone Number
            </p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium text-xl animate-pulse">
              +94766862420
            </p>
          </div>

          <div className={singleRowStyle}>
            <p className="text-xl font-medium text-primaryColor1 dark:text-dPrimaryColor4 ">
              Email
            </p>
            <p className="text-primaryColor4 dark:text-dPrimaryColor3 font-medium text-xl animate-pulse">
              smschathu1234@gmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalDetails;
