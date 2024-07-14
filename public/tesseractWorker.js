// import { createWorker, setLogging } from 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.0/dist/tesseract.min.js';
import { createWorker, setLogging } from 'tesseract.js';
// Import mongoose
const mongoose = require('mongoose');

const Document = require('../models/Document');
const tesseractWorkerPath = './assets/lib/tesseract/worker.min.js';
const tesseractLangPath = './assets/lib/tesseract/lang-data/4.0.0_best';
const tesseractCorePath = './assets/lib/tesseract/tesseract-core.wasm.js';

var pdfWorker,percent,_PDF_DOC,_PAGE,noOfPages;
var _ZOOM_FACTOR = 1;
var currentPage = 1;

// Initialize Tesseract Image Worker
const initTesseractImgWorker = async () => {
    const ocrImgProgress = document.getElementById('ocrImgProgress');
    const ocrImgProgressStatus = document.getElementById('ocrImgProgressStatus');
    const imgWorker = await createWorker({
      workerPath: tesseractWorkerPath,
      langPath: tesseractLangPath,
      corePath: tesseractCorePath,
      logger: msg => {
            console.log('msg');
            console.log(msg);
            if (msg.status === 'recognizing text') {
              const progressPercent = Number(msg.progress) * 100;
              ocrImgProgress.style.width = `${progressPercent}%`;
              ocrImgProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⏳ <strong>${progressPercent.toFixed(0)}%</strong></p>`;
            }
          }
    });
    // const imgWorker = await createWorker({
    //   workerPath: tesseractWorkerPath,
    //   langPath: tesseractLangPath,
    //   corePath: tesseractCorePath,
    //   logger: msg => {
    //     console.log(msg);
    //     if (msg.status === 'recognizing text') {
    //       const progressPercent = Number(msg.progress) * 100;
    //       ocrImgProgress.style.width = `${progressPercent}%`;
    //       ocrImgProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⏳ <strong>${progressPercent.toFixed(0)}%</strong></p>`;
    //     }
    //   }
    // });
    setLogging(true);
    
    await imgWorker.load();
    await imgWorker.loadLanguage('eng');
    await imgWorker.initialize('eng');
  
    // Set up a message handler to receive logs from the worker
    // imgWorker.worker.onmessage = (e) => {

    //   const msg = e.data;
    //   console.log(msg);
    //   if (msg.status === 'recognizing text') {
    //     const progressPercent = Number(msg.progress) * 100;
    //     ocrImgProgress.style.width = `${progressPercent}%`;
    //     ocrImgProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⏳ <strong>${progressPercent.toFixed(0)}%</strong></p>`;
    //   }
    // };
  
    return imgWorker;
  };
  
  // Load image from URL
  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (err) => reject(err));
      img.src = url;
    });
  };
  
  // Read file as Data URL
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };
  
  // Handle image upload and OCR process
  const handleImageUpload = async (event) => {
    const imgPreview = document.getElementById('img-preview');
    const ocrImgProgress = document.getElementById('ocrImgProgress');
    const ocrImgProgressStatus = document.getElementById('ocrImgProgressStatus');
    document.getElementById("BOLData").style.display = "block";

    const inputText = document.getElementById('inputText');
  
    const file = event.currentTarget.files[0];
    if (!file) return;
  
    const imgWorker = await initTesseractImgWorker();
    const b64str = await readFileAsDataURL(file);
  
    imgPreview.style.backgroundImage = `url("${b64str}")`;
    const loadedImg = await loadImage(b64str);
  
    const result = await imgWorker
    .recognize(loadedImg);
  
    const words = result.data.words;
    let combinedText = '';
    for (let w of words) {
      let str = w.text;
      let newStr = (str.length > 1 && str.charAt(str.length - 1) === '-') ? str.slice(0, -1) : (str + ' ');
      combinedText += newStr;
    }
    inputText.value = combinedText;
  console.log('combinedText')
  console.log(combinedText)
  // saveImageToMongo(combinedText);
    await imgWorker.terminate();

    ocrImgProgress.style.width = '100%';
    ocrImgProgress.classList.remove('progress-bar-animated');
    ocrImgProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⌛ <strong>Done.</strong></p>`;
  };
//   const saveImageToMongo = (combinedText)=>{

// // Create a new document instance
// const newDocument = new Document({
//   name: 'Example Document',
//   text: combinedText
//   // Uncomment if needed
//   // progress: 50,
//   // status: 'In Progress'
// });

// // Save the document to the database
// newDocument.save()
//   .then(doc => {
//       console.log('Document saved:', doc);
//   })
//   .catch(err => {
//       console.error('Error saving document:', err);
//   });
//   }
  // PDF Extraction
  const initPdfTesseractWorker = async ()=> {
    var ocrPageProgress = document.getElementById('ocrPageProgress');
    var ocrPageProgressStatus = document.getElementById('ocrPageProgressStatus');
    pdfWorker = await createWorker({
      workerPath: tesseractWorkerPath,
      langPath: tesseractLangPath,
      corePath: tesseractCorePath,
      logger: msg => {
        console.log(msg);
        if (msg.status == 'recognizing text') {
          ocrPageProgress['style']['width'] = `${Number((msg.progress) * 100)}%`;
          ocrPageProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⏳ <strong>${(Number((msg.progress) * 100)).toFixed(0)}%</strong></p>`;
        }
      }
    });
    setLogging(true);

    await pdfWorker.load();
    await pdfWorker.loadLanguage('eng');
    await pdfWorker.initialize('eng');

    return new Promise((resolve) => resolve('worker initialised.'));
  }
  async function handlePDFUpload(ev) {
    let file = ev.currentTarget.files[0];
    if (!file) return;
    let b64str = await readFileAsDataURL(file);
    showPDF(b64str);
}

async function showPage(pageNo) {
    var currentPageNo = document.getElementById('currentPageNo');

    currentPage = pageNo;
    currentPageNo.innerHTML = pageNo;
    try {
        _PAGE = await _PDF_DOC.getPage(pageNo);
    } catch (error) {
        console.log(error.message);
    }
    return new Promise((resolve => resolve(_PAGE)));
}

async function extractPdfText(loadedImg) {
    var inputText = document.getElementById('inputText');
    var ocrPageProgress = document.getElementById('ocrPageProgress');
    var ocrPageProgressStatus = document.getElementById('ocrPageProgressStatus');

    const result = await pdfWorker.recognize(loadedImg);
    console.log(result);

    let data = result.data;
    let words = data.words;
    let combinedText = '';
    for (let w of words) {
        let str = (w.text);
        let newStr = (str.length > 1 && str.charAt(str.length - 1) == '-') ? str.substr(0, str.length - 1) : (str + ' ');
        combinedText += newStr;
    }
    document.getElementById('inputText').value = combinedText;
    ocrPageProgress.style.width = '100%';
    ocrPageProgress.classList.remove('progress-bar-animated');
    ocrPageProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⌛ <strong>Done.</strong></p>`;
    // this.dataTesseractPDF(combinedText);

    return new Promise((resolve) => resolve('extraction done.'));
}

async function showPDF(pdf_url) {
    var pageLoadingSignal = document.getElementById('pageLoadingSignal');
    var pagePreview = document.getElementById('page-preview');

    var currentPageNo = document.getElementById('currentPageNo');
    var processedPages = document.getElementById('processedPages');
    var totalPages = document.getElementById('totalPages');

    var pdfjsLib = window['pdfjs-dist/build/pdf'];

    pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/lib/pdf/pdf.worker.min.js';
    try {
        _PDF_DOC = await pdfjsLib.getDocument({
            url: pdf_url
        }).promise;
    } catch (error) {
        console.log('getting this error');
        console.log(error.message);
    }
    console.log('this._PDF_DOC');
    console.log(_PDF_DOC);
    const noOfPages = _PDF_DOC._pdfInfo.numPages;
    totalPages.innerHTML = noOfPages;
    console.log(noOfPages);
    console.log(currentPage);

    while (currentPage <= noOfPages) {
        await initPdfTesseractWorker();

        pageLoadingSignal.style.visibility = 'visible';
        currentPageNo.innerHTML = String(currentPage);

        const _PAGE = await showPage(currentPage);
        let b64str = await scalePDFPage(_PAGE);
        pagePreview.style.backgroundImage = 'url("' + b64str + '")';

        let loadedImg = await loadImage(b64str);
        await extractPdfText(loadedImg);
        processedPages.insertAdjacentHTML('beforeend', "<p class='mb-1 mt-1'>🗹 <a href='" + b64str + "' download='" + currentPage + ".png'>Page " + currentPage + "</a>— ⌛ <strong>Done.</strong></p>");

        await pdfWorker.terminate();
        currentPage++;
    }

    pageLoadingSignal.style.visibility = 'hidden';
}

async function scalePDFPage(_PAGE) {
    const pixelRatio = window.devicePixelRatio * 2;

    var _CANVAS = document.createElement('canvas');
    let pdfOriginalWidth = _PAGE.getViewport(_ZOOM_FACTOR).width;
    let viewport = _PAGE.getViewport(_ZOOM_FACTOR);
    let viewpointHeight = viewport.height;

    _CANVAS.width = pdfOriginalWidth * pixelRatio;
    _CANVAS.height = viewpointHeight * pixelRatio;

    _CANVAS.style.width = `${pdfOriginalWidth}px`;
    _CANVAS.style.height = `${viewpointHeight}px`;

    _CANVAS.getContext('2d').scale(pixelRatio, pixelRatio);

    var renderContext = {
        canvasContext: _CANVAS.getContext('2d'),
        viewport: viewport
    };
    try {
        await _PAGE.render(renderContext);
    } catch (error) {
        alert(error.message);
    }
    return new Promise((resolve => resolve(_CANVAS.toDataURL())));
}
// mongoose.connect('mongodb+srv://jisa-anu-2024:jisaanu2024@cluster0.jfbx4.mongodb.net/sample_hscode?retryWrites=true&w=majority', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => console.log('Connected to MongoDB'))
// .catch(err => console.error('Error connecting to MongoDB:', err));

  // Add event listener for image upload
  document.getElementById('uploadImg').addEventListener('change', handleImageUpload);
  document.getElementById('uploadPDF').addEventListener('change', handlePDFUpload);
    