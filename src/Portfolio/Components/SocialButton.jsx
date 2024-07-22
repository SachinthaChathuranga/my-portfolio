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
      <Link to={'#'}>
      <FaLinkedin />
      </Link>
      <Link to={'#'}>
      <FaGithub />
      </Link>
      <Link to={'#'}>
      <FaFacebookSquare />
      </Link>
      <Link to={'#'}>
      <FaInstagramSquare />
      </Link>
      <Link to={'#'}>
      <FaYoutube />
      </Link>
      <Link to={'#'}>
      <FaTwitterSquare />
      </Link>
    </div>
  )
}

export default SocialButton
