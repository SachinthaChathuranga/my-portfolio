import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./CalendarStyles.css"; // Import your custom styles
import "aos/dist/aos.css"; // Import AOS CSS
import AOS from "aos";

function CalendarWithTime() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
      AOS.init({
        duration: 1000, // Customize duration of the animation (optional)
        easing: "ease-in-out", // Customize easing function (optional)
        once: true, // Whether to animate only once (optional)
      });
    }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  return (
    <div className="h-fit w-full  font-poppins" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="500">
      <div className="m-1 overflow-hidden  p-5  shadow-lg rounded-lg bg-primaryColor9 dark:bg-dPrimaryColor8 text-primaryColor1 dark:text-dPrimaryColor4">
        <div className="flex flex-col ">
          {/* Display Current Time */}
          <div className="flex justify-around text-primaryColor2 dark:text-dPrimaryColor3 animate-pulse">
            <div className="text-2xl font-bold">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-2xl font-bold">
              {currentTime.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>

          {/* Calendar with Current Date Marked */}
          <div className="flex items-center justify-center pt-3">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              highlightDates={[new Date()]}
              inline
              className="border rounded-md p-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarWithTime;
