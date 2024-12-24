import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import "aos/dist/aos.css"; // Import AOS CSS
import AOS from "aos";

function Contact() {
  useEffect(() => {
    AOS.init({
      duration: 1000, // Customize duration of the animation (optional)
      easing: "ease-in-out", // Customize easing function (optional)
      once: true, // Whether to animate only once (optional)
    });
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "", // Include the subject in the state
    desc: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    setIsSending(true); // Disable the button while sending
    setMessage(""); // Clear any previous messages

    // Make sure all fields are included in templateParams
    const templateParams = {
      name: formData.name, // Name from the form
      subject: formData.subject, // Subject from the form
      message: formData.desc, // Message description from the form
      phone: formData.phone, // Phone number from the form
    };

    emailjs
      .send(
        "service_ayccxmc", // Replace with your EmailJS Service ID
        "template_z8relid", // Replace with your EmailJS Template ID
        templateParams,
        "ErooJ7sWSFqBZCdv3" // Replace with your EmailJS Public Key
      )
      .then(
        (response) => {
          console.log("SUCCESS!", response.status, response.text);
          setIsSending(false);
          setMessage("Your message has been sent successfully!");
          // Reset the form
          setFormData({
            name: "",
            email: "",
            phone: "",
            subject: "",
            desc: "",
          });
        },
        (error) => {
          console.error("FAILED...", error);
          setIsSending(false);
          setMessage("Failed to send your message. Please try again later.");
        }
      );
  };

  return (
    <div
      className="px-5 mt-5"
      data-aos="fade-up"
      data-aos-duration="1000"
      data-aos-delay="700"
    >
      <div className="border-2 border-primaryColor1 dark:border-dPrimaryColor5 p-5 rounded-md ">
        <h1 className="w-fit px-10 m-auto bg-primaryColor8 dark:bg-dPrimaryColor9 text-3xl font-serif font-bold text-primaryColor2 dark:text-dPrimaryColor1   mb-5 -mt-10 ">
          <span className="animate-pulse">Contact Us</span>
        </h1>
        <form
          className="grid grid-rows-3 grid-flow-col gap-4"
          onSubmit={handleSubmit}
        >
          {/* Left-hand side: Inputs */}
          <div className="row-span-3 flex flex-col gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              required
              className="p-3 border border-gray-300 dark:border-dPrimaryColor8 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor2 dark:focus:ring-dPrimaryColor7 dark:bg-dPrimaryColor8 "
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="p-3 border border-gray-300 dark:border-dPrimaryColor8 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor2 dark:focus:ring-dPrimaryColor7 dark:bg-dPrimaryColor8 "
            />
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              required
              className="p-3 border border-gray-300 dark:border-dPrimaryColor8 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor2 dark:focus:ring-dPrimaryColor7 dark:bg-dPrimaryColor8 "
            />
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Subject"
              required
              className="p-3 border border-gray-300 dark:border-dPrimaryColor8 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor2 dark:focus:ring-dPrimaryColor7 dark:bg-dPrimaryColor8 "
            />
          </div>

          {/* Right-hand side: Textarea and Submit */}
          <div className="col-span-2 row-span-3 flex flex-col gap-4">
            <textarea
              name="desc"
              value={formData.desc}
              onChange={handleChange}
              placeholder="Your Message"
              rows="8"
              required
              className="p-3 border border-gray-300 dark:border-dPrimaryColor8 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor2 dark:focus:ring-dPrimaryColor7 dark:bg-dPrimaryColor8 "
            ></textarea>
            <button
              type="submit"
              className={`p-3 bg-primaryColor2 dark:bg-dPrimaryColor6 text-white rounded-md cursor-pointer ${
                isSending
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primaryColor3 dark:hover:bg-dPrimaryColor7"
              }`}
              disabled={isSending}
            >
              {isSending ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
        {/* Display success or error message */}
        {message ? (
          <p className="text-center mt-5">{message}</p>
        ) : (
          <span> </span>
        )}
      </div>
    </div>
  );
}

export default Contact;
