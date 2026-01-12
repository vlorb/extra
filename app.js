// Get room from URL
const params = new URLSearchParams(window.location.search);
const room = params.get("room");
if (!room) throw new Error("No session specified!");

// Unique user ID
const user = Math.random().toString(36).slice(2);

// Firebase reference
const ref = db.ref("sessions/" + room);

// Initialize session
ref.once("value", snap => {
  if (!snap.exists()) {
    ref.set({ page: 1, confirmations: {} });
  }
});

// Canvas and status
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");
const statusDiv = document.getElementById("status");

let pdfDoc;
let currentPage = 1;

// Load PDF
const pdfPath = window.location.origin + "/sample.pdf"; // absolute path
pdfjsLib.getDocument(pdfPath).promise.then(pdf => {
  pdfDoc = pdf;
  renderPage(currentPage);
}).catch(err => console.error("PDF failed to load:", err));

// Listen for Firebase changes
ref.on("value", snap => {
  const data = snap.val();
  if (!data) return;

  if (data.page !== currentPage) {
    currentPage = data.page;
    renderPage(currentPage);
  }

  const conf = data.confirmations || {};
  const count = Object.keys(conf).length;
  statusDiv.textContent = `Confirmed: ${count}/2`;
});

// Confirm button
document.getElementById("confirm").onclick = () => {
  ref.child("confirmations/" + user).set(true);

  ref.child("confirmations").once("value", snap => {
    if (snap.numChildren() >= 2) {
      ref.update({ page: firebase.database.ServerValue.increment(1), confirmations: {} });
    }
  });
};

// Render PDF page
function renderPage(num) {
  if (!pdfDoc) return;
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: 1.3 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      console.log("Page rendered:", num);
    });
  }).catch(err => console.error("Render failed:", err));
}
