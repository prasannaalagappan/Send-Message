const options = {
  laptop: [
    { value: "laptop-screen", label: "Laptop Screen" },
    { value: "laptop-working", label: "Laptop Working" },
    { value: "laptop-not-working", label: "Laptop Not Working" },
  ],
  screen: [
    { value: "screen-on", label: "Screen On" },
    { value: "screen-off", label: "Screen Off" },
  ],
};

const device = document.querySelector("#device");
const issue = document.querySelector("#issue");
const numberOne = document.querySelector("#numberOne");
const numberTwo = document.querySelector("#numberTwo");
const customerName = document.querySelector("#customerName");
const message = document.querySelector("#message");
const previewMessage = document.querySelector("#previewMessage");
const selectedBadge = document.querySelector("#selectedBadge");
const statusPill = document.querySelector("#statusPill");
const serviceForm = document.querySelector("#serviceForm");
const resetBtn = document.querySelector("#resetBtn");
const sendFirst = document.querySelector("#sendFirst");
const sendSecond = document.querySelector("#sendSecond");
const cameraBtn = document.querySelector("#cameraBtn");
const captureBtn = document.querySelector("#captureBtn");
const cameraWrap = document.querySelector("#cameraWrap");
const cameraVideo = document.querySelector("#cameraVideo");
const photoInput = document.querySelector("#photoInput");
const photoPreview = document.querySelector("#photoPreview");
const photoImage = document.querySelector("#photoImage");
const previewPhoto = document.querySelector("#previewPhoto");
const photoName = document.querySelector("#photoName");
const clearPhoto = document.querySelector("#clearPhoto");
const sharePhoto = document.querySelector("#sharePhoto");

const storageKey = "service-dashboard-state";
let cameraStream = null;
let selectedPhoto = null;

function cleanPhone(value) {
  return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

function currentIssueLabel() {
  return issue.options[issue.selectedIndex]?.textContent || "";
}

function buildMessage() {
  const name = customerName.value.trim();
  const chosenDevice = device.options[device.selectedIndex].textContent;
  const chosenIssue = currentIssueLabel();
  const lineOne = name ? `Name: ${name}` : "Name:";

  return `${lineOne}
Category: ${chosenDevice}
Status: ${chosenIssue}

Please update this service request.`;
}

function fillIssueOptions(selectedValue) {
  issue.innerHTML = "";
  options[device.value].forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    issue.appendChild(option);
  });

  if (selectedValue && [...issue.options].some((item) => item.value === selectedValue)) {
    issue.value = selectedValue;
  }
}

function saveState() {
  const state = {
    device: device.value,
    issue: issue.value,
    numberOne: numberOne.value,
    numberTwo: numberTwo.value,
    customerName: customerName.value,
    message: message.value,
  };
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function showPhoto(file, url) {
  selectedPhoto = { file, url };
  photoImage.src = url;
  previewPhoto.src = url;
  photoName.textContent = file.name || "Captured photo";
  photoPreview.hidden = false;
  previewPhoto.hidden = false;
}

function clearSelectedPhoto() {
  if (selectedPhoto?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(selectedPhoto.url);
  }

  selectedPhoto = null;
  photoImage.removeAttribute("src");
  previewPhoto.removeAttribute("src");
  photoName.textContent = "No photo selected";
  photoPreview.hidden = true;
  previewPhoto.hidden = true;
}

function stopCamera() {
  if (!cameraStream) {
    return;
  }

  cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  cameraVideo.srcObject = null;
  cameraWrap.hidden = true;
}

function updatePreview({ keepMessage = false } = {}) {
  if (!keepMessage) {
    message.value = buildMessage();
  }

  previewMessage.textContent = message.value;
  selectedBadge.textContent = currentIssueLabel();
  saveState();
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");

  if (saved.device && options[saved.device]) {
    device.value = saved.device;
  }

  fillIssueOptions(saved.issue);
  numberOne.value = saved.numberOne || "";
  numberTwo.value = saved.numberTwo || "";
  customerName.value = saved.customerName || "";
  message.value = saved.message || buildMessage();
  updatePreview({ keepMessage: Boolean(saved.message) });
}

function flashStatus(text, tone = "ready") {
  statusPill.textContent = text;
  statusPill.classList.remove("toast");
  statusPill.style.background = tone === "error" ? "#fff0e6" : "#e8fff5";
  statusPill.style.color = tone === "error" ? "#9a440b" : "#086240";

  requestAnimationFrame(() => statusPill.classList.add("toast"));

  window.setTimeout(() => {
    statusPill.textContent = "Ready";
    statusPill.style.background = "";
    statusPill.style.color = "";
  }, 2200);
}

function openWhatsApp(rawNumber) {
  const phone = cleanPhone(rawNumber);

  if (!phone || phone.length < 10) {
    flashStatus("Enter valid number", "error");
    return false;
  }

  const normalized = phone.startsWith("+") ? phone.slice(1) : phone;
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message.value)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    flashStatus("Camera not supported", "error");
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraVideo.srcObject = cameraStream;
    cameraWrap.hidden = false;
    flashStatus("Camera ready");
  } catch (error) {
    flashStatus("Camera permission needed", "error");
  }
}

function capturePhoto() {
  if (!cameraStream) {
    flashStatus("Open camera first", "error");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = cameraVideo.videoWidth || 1280;
  canvas.height = cameraVideo.videoHeight || 720;
  canvas.getContext("2d").drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) {
      flashStatus("Photo failed", "error");
      return;
    }

    const file = new File([blob], `service-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    showPhoto(file, URL.createObjectURL(file));
    stopCamera();
    flashStatus("Photo captured");
  }, "image/jpeg", 0.92);
}

async function shareSelectedPhoto() {
  if (!selectedPhoto) {
    flashStatus("Select photo first", "error");
    return;
  }

  if (navigator.canShare?.({ files: [selectedPhoto.file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [selectedPhoto.file],
        text: message.value,
        title: "Service request photo",
      });
      flashStatus("Share opened");
    } catch (error) {
      flashStatus("Share cancelled", "error");
    }
    return;
  }

  flashStatus("Use Download Photo", "error");
}

function sendBoth() {
  const firstSent = openWhatsApp(numberOne.value);
  const secondSent = openWhatsApp(numberTwo.value);

  if (firstSent && secondSent) {
    flashStatus("Message opened");
  }
}

device.addEventListener("change", () => {
  fillIssueOptions();
  updatePreview();
});

issue.addEventListener("change", () => updatePreview());
customerName.addEventListener("input", () => updatePreview());
numberOne.addEventListener("input", saveState);
numberTwo.addEventListener("input", saveState);
message.addEventListener("input", () => updatePreview({ keepMessage: true }));

serviceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendBoth();
});

sendFirst.addEventListener("click", () => {
  if (openWhatsApp(numberOne.value)) {
    flashStatus("Number 1 opened");
  }
});

sendSecond.addEventListener("click", () => {
  if (openWhatsApp(numberTwo.value)) {
    flashStatus("Number 2 opened");
  }
});

cameraBtn.addEventListener("click", openCamera);
captureBtn.addEventListener("click", capturePhoto);
sharePhoto.addEventListener("click", shareSelectedPhoto);
clearPhoto.addEventListener("click", () => {
  stopCamera();
  clearSelectedPhoto();
  flashStatus("Photo cleared");
});

photoInput.addEventListener("change", () => {
  const [file] = photoInput.files;

  if (!file) {
    return;
  }

  clearSelectedPhoto();
  showPhoto(file, URL.createObjectURL(file));
  flashStatus("Photo selected");
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  device.value = "laptop";
  fillIssueOptions("laptop-screen");
  numberOne.value = "";
  numberTwo.value = "";
  customerName.value = "";
  stopCamera();
  clearSelectedPhoto();
  updatePreview();
  flashStatus("Reset done");
});

window.addEventListener("beforeunload", stopCamera);

loadState();
