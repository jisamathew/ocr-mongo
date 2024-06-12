const Tesseract = require('tesseract.js');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const tesseractWorkerPath = './assets/lib/tesseract/worker.min.js';
const tesseractLangPath = './assets/lib/tesseract/lang-data/4.0.0_best';
const tesseractCorePath = './assets/lib/tesseract/tesseract-core.wasm.js';

class TesseractComponent {
  constructor(dialogbolno) {
    // this.BOL = dialogbolno.dataKey;
    // this.initTesseractImgWorker();
    // this.initPdfTesseractWorker();
  }

   //Tesseract Starts Here
  //Image -> Text(Tesseract)

  async initTesseractImgWorker() {

    var ocrImgProgress = document.getElementById('ocrImgProgress');
    var ocrImgProgressStatus = document.getElementById('ocrImgProgressStatus');

    this.imgWorker = await Tesseract.createWorker({
      workerPath: tesseractWorkerPath,
      langPath: tesseractLangPath,
      corePath: tesseractCorePath,
      logger: msg => {
        console.log(msg);
        if (msg.status == 'recognizing text') {
          this.percent = Number(msg.progress) * 100;
          // this.percent = (parseInt(parseFloat(msg.progress)*100))

          ocrImgProgress['style']['width'] = `${Number(msg.progress) * 100}%`;
          ocrImgProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⏳ <strong>${(Number(msg.progress) * 100).toFixed(0)}%</strong></p>`;
        }
      }
    });
    Tesseract.setLogging(true);

    await this.imgWorker.load();
    await this.imgWorker.loadLanguage('eng');
    await this.imgWorker.initialize('eng');

    return new Promise((resolve) => resolve('worker initialised.'));
  }

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      let fileredr = new FileReader();
      fileredr.onload = () => resolve(fileredr.result);
      fileredr.onerror = () => reject(fileredr);
      fileredr.readAsDataURL(file);

    });
  }
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (err) => reject(err));
      img.src = url;
    })
  };

  async uploadImageChange(ev) {
    
     var imgPreview = document.getElementById('img-preview');
    var ocrImgProgress = document.getElementById('ocrImgProgress');
    var ocrImgProgressStatus = document.getElementById('ocrImgProgressStatus');

    var inputText =   document.getElementById('inputText');

    let file = ev.currentTarget.files[0];
    if (!file) return;

    (async () => {
      await this.initTesseractImgWorker();

      let b64str = await this.readFileAsDataURL(file);
      imgPreview['style']['background-image'] = 'url("' + b64str + '")';
      let loadedImg = await this.loadImage(b64str);

      const result = await this.imgWorker.recognize(loadedImg);

      let words = result.data.words;
      let combinedText = '';
      for (let w of words) {
        let str = (w.text);
        let newStr = (str.length > 1 && str.charAt(str.length - 1) == '-') ? str.substr(0, str.length - 1) : (str + ' ');
        combinedText += newStr;
      }
      document.getElementById('inputText').value = combinedText;
   
      // inputText.insertAdjacentText('beforeend', (' ' + combinedText));

      await this.imgWorker.terminate();
      this.dataTesseractImage(combinedText);
      ocrImgProgress['style']['width'] = '100%';
      ocrImgProgress.classList.remove('progress-bar-animated');
      ocrImgProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⌛ <strong>Done.</strong></p>`;
    })();

  }
  //PDF -> Text(Tesseract) Starts Here
  hideContentView(){
    console.log('in hide content');
    document.getElementById("BOLInfo").style.display = "none";
    document.getElementById("BOLData").style.display = "none";
  
  }

  async initPdfTesseractWorker() {
    var ocrPageProgress = document.getElementById('ocrPageProgress');
    var ocrPageProgressStatus = document.getElementById('ocrPageProgressStatus');
    this.pdfWorker = await Tesseract.createWorker({
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
    Tesseract.setLogging(true);

    await this.pdfWorker.load();
    await this.pdfWorker.loadLanguage('eng');
    await this.pdfWorker.initialize('eng');

    return new Promise((resolve) => resolve('worker initialised.'));
  }
  async uploadPDFChange(ev) {
  let file = ev.currentTarget.files[0];
    if (!file) return;
    let b64str = await this.readFileAsDataURL(file);
    this.showPDF(b64str);

  }
  async showPage(pageNo) {
    var currentPageNo = document.getElementById('currentPageNo');

    this.currentPage = pageNo;
    currentPageNo.innerHTML = pageNo;
    try {
      this._PAGE = await this._PDF_DOC.getPage(pageNo);
    } catch (error) {
      console.log(error.message);
    }
    return new Promise((resolve => resolve(this._PAGE)));
  }

  async extractPdfText(loadedImg) {
    var inputText =   document.getElementById('inputText');
    var ocrPageProgress = document.getElementById('ocrPageProgress');
    var ocrPageProgressStatus = document.getElementById('ocrPageProgressStatus');

    const result = await this.pdfWorker.recognize(loadedImg);
    console.log(result);

    let data = result.data;

    let words = data.words;
    let combinedText = '';
    for (let w of words) {
      let str = (w.text);
      let newStr = (str.length > 1 && str.charAt(str.length - 1) == '-') ? str.substr(0, str.length - 1) : (str + ' ');
      combinedText += newStr;
    }
    document.getElementById('inputText').value=combinedText
    // inputText.insertAdjacentText('beforeend', (' ' + combinedText));

    ocrPageProgress['style']['width'] = '100%';
    ocrPageProgress.classList.remove('progress-bar-animated');
    ocrPageProgressStatus.innerHTML = `<p class='mb-1 mt-1'>⌛ <strong>Done.</strong></p>`;
    this.dataTesseractPDF(combinedText)

    return new Promise((resolve) => resolve('extraction done.'));
  }

  async showPDF(pdf_url) {
    var pageLoadingSignal = document.getElementById('pageLoadingSignal');
    var pagePreview = document.getElementById('page-preview');

    var currentPageNo = document.getElementById('currentPageNo');
    var processedPages = document.getElementById('processedPages');
    var totalPages = document.getElementById('totalPages');

    // Loaded via <script> tag, create shortcut to access PDF.js exports.
    var pdfjsLib = window['pdfjs-dist/build/pdf'];

    // The workerSrc property shall be specified.
    // pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

    pdfjsLib.GlobalWorkerOptions.workerSrc = '../assets/lib/pdf/pdf.worker.min.js';
    try {
    

      this._PDF_DOC = await pdfjsLib.getDocument({
        url: pdf_url
      }).promise;
    } catch (error) {
      console.log('getting this error')
      console.log(error.message);
    }
    console.log('this._PDF_DOC')
    console.log(this._PDF_DOC)
    this.noOfPages = this._PDF_DOC.numPages;
    totalPages.innerHTML = this.noOfPages;
    console.log(this.noOfPages)
    console.log(this.currentPage)

    while (this.currentPage <= this.noOfPages) {
      await this.initPdfTesseractWorker();

      pageLoadingSignal['style']['visibility'] = 'visible';
      currentPageNo.innerHTML = String(this.currentPage);

      this._PAGE = await this.showPage(this.currentPage);
      let b64str = await this.scalePDFPage();
      pagePreview['style']['background-image'] = 'url("' + b64str + '")';

      let loadedImg = await this.loadImage(b64str);
      await this.extractPdfText(loadedImg);
      processedPages.insertAdjacentHTML('beforeend', "<p class='mb-1 mt-1'>🗹 <a href='" + b64str + "' download='" + this.currentPage + ".png'>Page " + this.currentPage + "</a>— ⌛ <strong>Done.</strong></p>");

      await this.pdfWorker.terminate();
      this.currentPage++;
    } // end-while loop

    pageLoadingSignal['style']['visibility'] = 'hidden';
  }


  async scalePDFPage() {

    const pixelRatio = window.devicePixelRatio * 2;

    var _CANVAS = document.createElement('canvas');
    let pdfOriginalWidth = this._PAGE.getViewport(this._ZOOM_FACTOR).width;
    let viewport = this._PAGE.getViewport(this._ZOOM_FACTOR);
    let viewpointHeight = viewport.height;

    _CANVAS.width = pdfOriginalWidth * pixelRatio;
    _CANVAS.height = viewpointHeight * pixelRatio;

    _CANVAS['style']['width'] = `${pdfOriginalWidth}px`;
    _CANVAS['style']['height'] = `${viewpointHeight}px`;

    _CANVAS.getContext('2d').scale(pixelRatio, pixelRatio);

    var renderContext = {
      canvasContext: _CANVAS.getContext('2d'),
      viewport: viewport
    };
    try {
      await this._PAGE.render(renderContext);
    } catch (error) {
      alert(error.message);
    }
    return new Promise((resolve => resolve(_CANVAS.toDataURL())));
  }




  dataTesseractPDF(bol) {
    var textByLine = bol.split("\n");
    console.log(textByLine);
    var stringArray = textByLine[0].split(/(\s+)/);


    //extra BOL/bill-of-lading-tesseract.pdf
    // var Consignee = stringArray[308] + ' ' + stringArray[310]

    // var VE = stringArray[442]+" "+stringArray[444]
    // var VOY = stringArray[448]
    // var POL = stringArray[456];
    // var POD = stringArray[464];
    // var CSS = stringArray[542].split(":")[1];
    // var CSS2 = CSS.split("/");
    // var ContainerNo = CSS2[0]
    // var SealNo = CSS2[1]
    // var Size = CSS2[2]
    // var DOIssue = stringArray[600] + ' ' + stringArray[602]
    // var freightcharges = stringArray[548].split(":")[1]
    // var ShippedOnBoard = stringArray[558] + ' ' + stringArray[560]
    // console.log('test data')
    // console.log(stringArray[682].split("`"));

    // var ForwardingAgent = stringArray[682]+ ' ' + stringArray[684]
    // var CarrierCompany = stringArray[686]+" "+stringArray[688]
    // var signatoryName = stringArray[732]+" "+stringArray[734]


    //bill-of-lading.pdf
    this.BOLNo = stringArray[32]
    this.Shipper = stringArray[36]+" "+stringArray[38]
    this.Consignee = stringArray[302] + ' ' + stringArray[304]
    this.VE = stringArray[446]+" "+stringArray[448]
    this.VOY = stringArray[452]
    this.POL = stringArray[460];
    this.POD = stringArray[468];
    var CSS = stringArray[548].split(":")[1];
    var CSS2 = CSS.split("/");
    this.ContainerNo = CSS2[0]
    this.SealNo = CSS2[1]
    this.Size = CSS2[2]
    this.DOIssue = stringArray[604] + ' ' + stringArray[606]
    this.freightcharges = stringArray[554].split(":")[1]
    this.ShippedOnBoard = stringArray[564] + ' ' + stringArray[566]
    this.ForwardingAgent = stringArray[686]+ ' ' + stringArray[688]
    this.CarrierCompany = stringArray[690]+" "+stringArray[692]
    this.signatoryName = stringArray[736]+" "+stringArray[738];
    // console.log(stringArray);
    // console.log('BOLNo')
    // console.log(BOLNo);
    // // var Token = textByLine[9].split(" ")[0]; 
    // console.log('Shipper')
    // console.log(Shipper)
    // console.log('Consignee')
    // console.log(Consignee)
    // console.log('VESSEL')
    // console.log(VE)
    // console.log('VOYAGE')
    // console.log(VOY)
    // console.log('Port of Loading')
    // console.log(POL)
    // console.log('Port Of Discharge')
    // console.log(POD)
    // console.log(CSS)
    // console.log('CSS2')
    // console.log(CSS2)
    // console.log('ContainerNo')
    // console.log(ContainerNo)
    // console.log('SealNo')
    // console.log(SealNo)
    // console.log('Size')
    // console.log(Size)
    // console.log('DOIssue')
    // console.log(DOIssue)
    // console.log('freightcharges')
    // console.log(freightcharges)
    // console.log('ShippedOnBoard')
    // console.log(ShippedOnBoard)
    // console.log('ForwardingAgent')
    // console.log(ForwardingAgent)
    // console.log('CarrierCompany')
    // console.log(CarrierCompany)
    // // var Signatory = stringArray[42].split(" ");
    // // console.log('Signatory')
    // // console.log(Signatory)
    // console.log('signatoryName')
    // console.log(signatoryName);
    // document.getElementById("coverspin").style.display = "none";
    document.getElementById("BOLInfo").style.display = "block";
    document.getElementById("BOLData").style.display = "block";
document.getElementById('BOL').value = this.BOLNo;
    document.getElementById('Shipper').value = this.Shipper;
    document.getElementById('Consignee').value = this.Consignee;
    document.getElementById('Vessel').value = this.VE;
    document.getElementById('Voyage').value = this.VOY;
    document.getElementById('POL').value = this.POL;
    document.getElementById('POD').value = this.POD;
    document.getElementById('ContainerNo').value = this.ContainerNo;
    document.getElementById('SealNo').value = this.SealNo;
    document.getElementById('Size').value = this.Size;
    document.getElementById('DOIssue').value = this.DOIssue;
    document.getElementById('freightcharges').value = this.freightcharges;
    document.getElementById('ShippedOnBoard').value = this.ShippedOnBoard;
    document.getElementById('ForwardingAgent').value = this.ForwardingAgent;
    document.getElementById('CarrierCompany').value = this.CarrierCompany;
    document.getElementById('Signatory').value = this.signatoryName;
    // this.showBOLData();

  }
  dataTesseractImage(bol) {
    var textByLine = bol.split("\n");
    console.log(textByLine);
    var stringArray = textByLine[0].split(/(\s+)/);

    console.log(stringArray);
    this.BOLNo = stringArray[32]
    this.Shipper = stringArray[36]+" "+stringArray[38]
    this.Consignee = stringArray[308] + ' ' + stringArray[310]
    this.VE = stringArray[438]+" "+stringArray[440]
    this.VOY = stringArray[444]
    this.POL = stringArray[452];
    this.POD = stringArray[460];
    var CSS = stringArray[538].split(":")[1];
    var CSS2 = CSS.split("/");
    this.ContainerNo = CSS2[0]
    this.SealNo = CSS2[1]
    this.Size = CSS2[2]
    this.DOIssue = stringArray[596] + ' ' + stringArray[598]+" "+stringArray[600]
    this.freightcharges = stringArray[544].split(":")[1]
    this.ShippedOnBoard = stringArray[554] + ' ' + stringArray[556]
    this.ForwardingAgent = stringArray[680] + ' ' + stringArray[682]
    this.CarrierCompany = stringArray[684]+" "+stringArray[686]
    this.signatoryName = stringArray[730]+" "+stringArray[732];
    
    console.log('BOLNo')
    console.log(this.BOLNo);
    console.log(this.BOL);
    // console.log('Shipper')
    // console.log(Shipper)
    // console.log('Consignee')
    // console.log(Consignee)
    // console.log('VESSEL')
    // console.log(VE)
    // console.log('VOYAGE')
    // console.log(VOY)
    // console.log('Port of Loading')
    // console.log(POL)
    // console.log('Port Of Discharge')
    // console.log(POD)
    // console.log(CSS)
    // console.log('CSS2')
    // console.log(CSS2)
    // console.log('ContainerNo')
    // console.log(ContainerNo)
    // console.log('SealNo')
    // console.log(SealNo)
    // console.log('Size')
    // console.log(Size)

    // console.log('DOIssue')
    // console.log(DOIssue)
    // console.log('freightcharges')
    // console.log(freightcharges)
    // console.log('ShippedOnBoard')
    // console.log(ShippedOnBoard)
    // console.log('ForwardingAgent')
    // console.log(ForwardingAgent)
    // console.log('CarrierCompany')
    // console.log(CarrierCompany)

    // // var Signatory = stringArray[42].split(" ");
    // // console.log('Signatory')
    // // console.log(Signatory)
    // console.log('signatoryName')
    // console.log(signatoryName);
    // document.getElementById("coverspin").style.display = "none";
    //View data on form
    document.getElementById("BOLInfo").style.display = "block";
    document.getElementById("BOLData").style.display = "block";
document.getElementById('BOL').value = this.BOLNo;
    document.getElementById('Shipper').value = this.Shipper;
    document.getElementById('Consignee').value = this.Consignee;
    document.getElementById('Vessel').value = this.VE;
    document.getElementById('Voyage').value = this.VOY;
    document.getElementById('POL').value = this.POL;
    document.getElementById('POD').value = this.POD;
    document.getElementById('ContainerNo').value = this.ContainerNo;
    document.getElementById('SealNo').value = this.SealNo;
    document.getElementById('Size').value = this.Size;
    document.getElementById('DOIssue').value = this.DOIssue;
    document.getElementById('freightcharges').value = this.freightcharges;
    document.getElementById('ShippedOnBoard').value = this.ShippedOnBoard;
    document.getElementById('ForwardingAgent').value = this.ForwardingAgent;
    document.getElementById('CarrierCompany').value = this.CarrierCompany;
    document.getElementById('Signatory').value = this.signatoryName;
    // this.showBOLData();
  }
  //Data Comparison with data saved in BC with data extracted(tesseract) from image/pdf uploaded
  clearData(){
    //  var inputText = document.getElementById('inputText');

      //  if (confirm('⚠ 𝗜𝗺𝗽𝗼𝗿𝘁𝗮𝗻𝘁 𝗡𝗼𝘁𝗶𝗰𝗲\n\n⯈ You are about to permanently remove all content present within the text field.\n\n⯈ Please proceed to select [ OK ] to confirm deletion. Else, select [ Cancel ] instead to abort action.')) {
         document.getElementById('inputText').value = '';
          //  inputText.value = '';

        //  }
    
  }
}

module.exports = TesseractComponent;
