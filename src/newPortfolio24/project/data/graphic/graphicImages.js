// Dynamically load all images from folders
const digitalArts = import.meta.glob('./digitalArt/*.(png|jpg|jpeg|svg)', { eager: true });
const pencilArts = import.meta.glob('./pencilArt/*.(png|jpg|jpeg|svg)', { eager: true });
const logos = import.meta.glob('./logo/*.(png|jpg|jpeg|svg)', { eager: true });
const flyers = import.meta.glob('./flyers/*.(png|jpg|jpeg|svg)', { eager: true });
const ieee = import.meta.glob('./ieee/*.(png|jpg|jpeg|svg)', { eager: true });

// Convert glob results to an array of URLs
const convertGlobToArray = (glob) => Object.values(glob).map((module) => module.default || module);


const imagesData = [
  {
    id: "g01",
    title: "Digital Arts",
    images: convertGlobToArray(digitalArts),
    method: "Illustrator",
    noOfImages: convertGlobToArray(digitalArts).length,
  },
  {
    id: "g02",
    title: "Pencil Arts",
    images: convertGlobToArray(pencilArts),
    method: "Pencils",
    noOfImages: convertGlobToArray(pencilArts).length,
  },
  {
    id: "g03",
    title: "Logos",
    images: convertGlobToArray(logos),
    method: "Illustrator",
    noOfImages: convertGlobToArray(logos).length,
  },
  {
    id: "g04",
    title: "Flyers",
    images: convertGlobToArray(flyers),
    method: ["Illustrator", "Photoshop"],
    noOfImages: convertGlobToArray(flyers).length,
  },
  {
    id: "g05",
    title: "IEEE",
    subtitle: "INSL, Glavel Club & Student Branch of Jaffna",
    images: convertGlobToArray(ieee),
    method: ["Illustrator", "Photoshop"],
    noOfImages: convertGlobToArray(ieee).length,
  },
];

export default imagesData;
