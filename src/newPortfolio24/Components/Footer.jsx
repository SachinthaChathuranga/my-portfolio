import React from "react";
import SocialButton from "../../Portfolio/Components/SocialButton";

function Footer() {
  return (
    <footer className="bg-primaryColor2 dark:bg-dPrimaryColor5 text-white py-6 mt-10">
      <div className="container mx-auto text-center">
        <p>
          &copy; {new Date().getFullYear()} SMSC. All Rights
          Reserved.
        </p>
        {/* <div className="mt-4">
          <a
            href="https://www.freeprivacypolicy.com/live/2d4bb311-c951-4a24-850c-e5937a643a9f"
            className="hover:text-primaryColor3 dark:hover:text-dPrimaryColor2 mx-3"
          >
            Privacy Policy
          </a>
          <a
            href="/terms-of-service"
            className="hover:text-primaryColor3 dark:hover:text-dPrimaryColor2 mx-3"
          >
            Terms of Service
          </a>
          <a
            href="/contact"
            className="hover:text-primaryColor3 dark:hover:text-dPrimaryColor2 mx-3"
          >
            Contact Us
          </a>
        </div> */}
        <div className="mt-4">
          <p>Follow us:</p>
          <div className="w-2/5 m-auto">
            <SocialButton />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
