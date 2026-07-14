import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Memories from "./components/Memories";
import WishCard from "./components/WishCard";
import Photobooth from "./components/Photobooth";
import Gallery from "./components/Gallery";
import Footer from "./components/Footer";

const STORAGE_KEY = "birthday-photobooth-gallery";

function loadGallery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [galleryItems, setGalleryItems] = useState(loadGallery);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(galleryItems));
    } catch {
      // storage may be unavailable (private browsing, quota) — safe to ignore
    }
  }, [galleryItems]);

  const handleNewResult = (dataUrl) => {
    const item = {
      id: `${Date.now()}`,
      src: dataUrl,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    setGalleryItems((prev) => [item, ...prev]);
  };

  const handleDeleteResult = (id) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllResults = () => {
    setGalleryItems([]);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Memories />
      <WishCard />
      <Photobooth onNewResult={handleNewResult} />
      <Gallery items={galleryItems} onDelete={handleDeleteResult} onClearAll={handleClearAllResults} />
      <Footer />
    </div>
  );
}
