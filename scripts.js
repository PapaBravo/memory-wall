const pages = document.getElementsByClassName('page');

pages[0].style.display = 'block';

const inputPhoto = document.getElementById('input-photo');

function onPhotoInputChange(e) {

    const options = {
        contain: true,
        orientation: true,
        canvas: true,
        pixelRatio: devicePixelRatio
    };

    function onImageLoad(result) {
        if (result.type === 'error') {
            console.error('Error loading image', result);
        } else {

            console.log('Generated canvas width and height', result.width, result.height);

            // Replace our default canvas (for video) with the generated one
            result.id = 'canvas-camera';

            annotateCameraContainer.removeChild(cameraCanvas);
            annotateCameraContainer.appendChild(result);

            cameraCanvas = result;

            const newWidth = cameraCanvas.style.width ? parseInt(cameraCanvas.style.width) : cameraCanvas.width;
            const newHeight = cameraCanvas.style.height ? parseInt(cameraCanvas.style.height) : cameraCanvas.height;

            // Make drawing canvas the same size
            drawCanvas.width = newWidth;
            drawCanvas.height = newHeight;
            emojiCanvas.width = newWidth;
            emojiCanvas.height = newHeight;

            setLiveCamera(false);

            AnnotatePage.show();
        }
    }

    // A little library which handles rotating the image appropriately depending
    // on the image's orientation (determined from the exif data) & scaling to fit
    LoadImage(e.target.files[0], onImageLoad, options);

}

inputPhoto.addEventListener('change', onPhotoInputChange);