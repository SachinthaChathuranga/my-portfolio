import React from 'react'
import { FaLinkedin } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";
import { FaFacebookSquare } from "react-icons/fa";
import { FaInstagramSquare } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";
import { FaTwitterSquare } from "react-icons/fa";
import { Link } from 'react-router-dom';

function SocialButton() {
  return (
    <div className='flex w-full text-primaryBlue1 text-3xl sm:text-4xl justify-around px-16 mt-6'>
      <Link to={'https://www.linkedin.com/in/sachintha-chathuranga-5b5750247/'}>
      <FaLinkedin />
      </Link>
      <Link to={'https://github.com/SachinthaChathuranga'}>
      <FaGithub />
      </Link>
      <Link to={'https://web.facebook.com/sms.chathu.79'}>
      <FaFacebookSquare />
      </Link>
      <Link to={'https://www.instagram.com/imsmschathu/'}>
      <FaInstagramSquare />
      </Link>
      <Link to={'https://youtube.com/@smscarya795?si=qKSh6XO2lLCYIVcf'}>
      <FaYoutube />
      </Link>
      <Link to={'#'}>
      <FaTwitterSquare />
      </Link>
    </div>
  )
}

export default SocialButton
