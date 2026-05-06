// Stub for future banner slider.
// Add image objects to BANNERS and renderBanners() will draw them at the top of the popup.
const BANNERS = [
  // { image: "banners/banner-1.png", href: "https://example.com" },
];

function renderBanners() {
  const root = document.getElementById("banners");
  if (!root || BANNERS.length === 0) return;

  // Minimal: just show the first banner. Replace with a slider later.
  const b = BANNERS[0];
  const a = document.createElement("a");
  a.href = b.href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.display = "block";
  a.style.height = "120px";
  a.style.background = `center/cover no-repeat url("${b.image}")`;
  root.appendChild(a);
}
