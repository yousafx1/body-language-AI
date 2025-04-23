const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const translationDiv = document.getElementById('translation');
const langBtn = document.getElementById('langBtn');
const camBtn = document.getElementById('camBtn');

let language = 'ar';
langBtn.onclick = () => {
  language = language === 'ar' ? 'en' : 'ar';
  langBtn.textContent = language === 'ar' ? 'EN' : 'AR';
};

let facingMode = 'user';
camBtn.onclick = () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  startCamera();
};

const translationMap = {
  'wave': { ar: 'مرحبا 👋', en: 'Hello 👋' },
  'thumbs_up': { ar: 'إعجاب 👍', en: 'Thumbs Up 👍' },
  'smile': { ar: 'ابتسامة 😊', en: 'Smile 😊' },
  'posture_good': { ar: 'وضعية مستقيمة 📈', en: 'Upright posture 📈' },
  'posture_bad': { ar: 'انحناء 📉', en: 'Slouch 📉' },
  'tone_high': { ar: 'نبرة حماسية 🔊', en: 'Energetic tone 🔊' },
  'tone_low': { ar: 'نبرة هادئة 🔈', en: 'Calm tone 🔈' }
};

const holistic = new Holistic({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.1/${file}` });
holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

holistic.onResults(results => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  let result = [];

  if (results.multiHandLandmarks?.length) {
    result.push('wave');
    const hand = results.multiHandLandmarks[0];
    if (hand[4].y < hand[3].y) result.push('thumbs_up');
  }

  if (results.faceLandmarks) {
    const left = results.faceLandmarks[61];
    const right = results.faceLandmarks[291];
    const smileRatio = Math.abs(right.x - left.x);
    if (smileRatio > 0.08) result.push('smile');
  }

  if (results.poseLandmarks) {
    const s = results.poseLandmarks;
    const shoulderY = (s[11].y + s[12].y) / 2;
    const hipY = (s[23].y + s[24].y) / 2;
    result.push((shoulderY < hipY - 0.1) ? 'posture_good' : 'posture_bad');
  }

  result.push(audioLevel > 0.2 ? 'tone_high' : 'tone_low');

  translationDiv.innerHTML = result.map(key => translationMap[key]?.[language] || '').join(' | ');
});

let camera;
function startCamera() {
  if (camera) camera.stop();
  camera = new Camera(videoElement, {
    onFrame: async () => await holistic.send({ image: videoElement }),
    width: 640,
    height: 480,
    facingMode: facingMode
  });
  camera.start();
}
startCamera();

// الصوت
let audioLevel = 0;
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    function updateAudio() {
      analyser.getByteFrequencyData(dataArray);
      audioLevel = dataArray.reduce((a, v) => a + v, 0) / dataArray.length / 128;
      requestAnimationFrame(updateAudio);
    }
    updateAudio();
  });
