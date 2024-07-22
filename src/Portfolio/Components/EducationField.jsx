import React from 'react'

function EducationField({name, date, marks}) {
  return (
    <div className='mb-4'>
        <div className='flex justify-between '>
            <p className='font-bold text-xl' >{name}</p>
            <p className='text-sm text-slate-500' >{date}</p>
        </div>
        <div>
            <p className='text-sm'>{marks}</p>
        </div>
      
    </div> 
  )
}

export default EducationField
