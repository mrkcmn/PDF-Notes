import { downloadZip } from "https://cdn.jsdelivr.net/npm/client-zip/index.js"

const b64toBlob = (b64Data, contentType='image/png', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
  
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
      
    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

const startSlide = document.getElementById('startSlide');
const endSlide = document.getElementById('endSlide');

function base64ToPng(canvas, filename) {
    canvas.toBlob(function(blob) {
        saveAs(blob, filename + '.png');
    });
}

document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const typedarray = new Uint8Array(e.target.result);
            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                const slidesContainer = document.getElementById('slidesContainer');
                slidesContainer.innerHTML = ''; // Clear previous slides
                const renderPromises = [];

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    renderPromises.push(
                        pdf.getPage(pageNum).then(function(page) {
                            const viewport = page.getViewport({ scale: 1 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            const renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
                            return page.render(renderContext).promise.then(function() {
                                const slideDiv = document.createElement('div');
                                slideDiv.className = 'slide';
                                slideDiv.id = pageNum;
                                slideDiv.appendChild(canvas);

                                const textBox = document.createElement('textarea');
                                textBox.style.height = canvas.height - 5.6 + 'px';
                                slideDiv.appendChild(textBox);

                                return slideDiv;
                            });
                        })
                    );
                }
                Promise.all(renderPromises).then(function(slideDivs) {
                    slideDivs.forEach(function(slideDiv) {
                        slidesContainer.appendChild(slideDiv);
                    });
                });

                startSlide.max = pdf.numPages;
                startSlide.value = 1;
                endSlide.max = pdf.numPages;
                endSlide.value = pdf.numPages;

            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Please upload a valid PDF file.');
    }
});


document.getElementById('saveButton').addEventListener('click', async function() {
    let markdown = '';

    const fileName = document.querySelector('input[type="text"]').value;
    const notes = document.querySelectorAll('textarea');
    let canvases = document.querySelectorAll('canvas');
    let files = [];

    for (let i = startSlide.value; i <= endSlide.value; i++) {
        markdown += `![[${fileName + '_' + i}.png]]\n${notes[i-1].value}\n\n`;
        
        const b64Data = canvases[i-1].toDataURL('image/png').split(',')[1];
        files.push({
            name: fileName + '_' + i + '.png',
            lastModified: new Date(),
            input: b64toBlob(b64Data)
        });
    }

    const content = await downloadZip(files).blob();
    saveAs(content, fileName + '.zip');

    saveAs(new Blob([markdown], { type: 'text/markdown' }), fileName + '.md');
});
