// On-device visual search: the photo never leaves the browser.
// MobileNet (TensorFlow.js) recognises the object and colorDetect finds its main colour;
// both are then turned into a normal product query.
import { detectColors } from './colorDetect';

const TFJS_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const MOBILENET_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';

// ImageNet label fragments -> catalog subcategories (first match wins, so specific labels go first)
const LABEL_MAP = [
  [['digital watch', 'analog clock', 'stopwatch'], ['Smartwatches']],
  [['stethoscope', 'neck brace', 'headphone', 'earphone'], ['Headphones']],
  [['hard disc', 'modem', 'cassette player'], ['Power Banks']],
  [['switch, electric switch', 'plug', 'power drill'], ['Adapters']],
  [['hand-held computer', 'ipod'], ['Tablets', 'iPads', 'Smartphones']],
  [['cellular telephone', 'cellular phone', 'dial telephone'], ['Smartphones']],
  [['laptop', 'notebook', 'desktop computer', 'computer keyboard', 'mouse, computer mouse'], ['Laptops']],
  [['reflex camera', 'polaroid camera', 'lens cap', 'camera'], ['DSLR Cameras', 'Mirrorless Cameras', 'Action Cameras']],
  [['television', 'monitor', 'screen, crt screen', 'home theater', 'entertainment center'], ['Smart TVs']],
  [['refrigerator', 'icebox'], ['Double Door', 'Single Door', 'Side-by-Side', 'Triple Door']],
  [['washer', 'automatic washer', 'washing machine'], ['Washing Machines']],
  [['microwave', 'microwave oven'], ['Microwave Ovens']],
  [['vacuum', 'vacuum cleaner'], ['Vacuum Cleaners']],
  [['electric fan', 'space heater', 'radiator'], ['Split ACs', 'Window ACs']],
];

const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)?.dataset.loaded) return resolve();
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
  script.onerror = () => { script.remove(); reject(new Error(`Could not load ${src}`)); };
  document.head.appendChild(script);
});

let modelPromise = null;

export const loadModel = () => {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript(TFJS_URL);
      await loadScript(MOBILENET_URL);
      return window.mobilenet.load({ version: 2, alpha: 1.0 });
    })().catch(err => {
      modelPromise = null; // allow a retry later
      throw err;
    });
  }
  return modelPromise;
};

export const mapLabelsToSubcategories = (predictions) => {
  const matches = [];
  for (const { className, probability } of predictions) {
    const label = className.toLowerCase();
    const entry = LABEL_MAP.find(([keys]) => keys.some(k => label.includes(k)));
    if (!entry) continue;
    for (const subcategory of entry[1]) {
      if (!matches.some(m => m.subcategory === subcategory)) {
        matches.push({ subcategory, label: className.split(',')[0], confidence: probability });
      }
    }
  }
  return matches;
};

/**
 * Analyses an <img> element.
 * @returns {Promise<{ matches, colors, predictions, modelError }>}
 */
export const analyzeImage = async (img) => {
  const colors = detectColors(img).slice(0, 3);
  try {
    const model = await loadModel();
    const predictions = await model.classify(img, 6);
    return { matches: mapLabelsToSubcategories(predictions), colors, predictions, modelError: null };
  } catch (err) {
    console.error(err);
    return { matches: [], colors, predictions: [], modelError: err.message };
  }
};

// Downscale a picked/captured image so it fits comfortably in session storage
export const fileToDataUrl = (file, maxSize = 640) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image we can read')); };
  img.src = url;
});
