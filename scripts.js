// const PAGES = document.getElementsByClassName('page');

const STORAGE_NAME_KEY = 'mw-name';
const PAGES = ['snap', 'gallery'];
const UPDATE_INTERVAL = 1000*60*5; // 5 minutes

const ALBUM_KEY = 'photos/';
const BUCKET_NAME = 'memory-wall';

let updateHandle;

/**
 * Displays the indicated page and hides all other PAGES.
 * @param {'snap'|'gallery'} page 
 */
function showPage(page) {
    PAGES.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        el.style.display = p === page ? 'block' : 'none'
        initPage(p);
    });
}

function initPage(page) {
    clearInterval(updateHandle);
    if (page === 'snap') {
        initSnapPage();
    } else if (page === 'gallery') {
        initGalleryPage();
    }
}

function initSnapPage() {
    if (!isNameSet()) {
        const name = window.prompt("What's your name?");
        localStorage.setItem(STORAGE_NAME_KEY, name);
    }
}

function initGalleryPage() {
    showImages();
    updateHandle = setInterval(showImages, UPDATE_INTERVAL);
}

/**
 * Checks if the device has a camera.
 * @returns {Promise<boolean>}
 */
function hasCamera() {
    return navigator.mediaDevices.enumerateDevices()
        .then(devices => devices.some(d => d.kind === 'videoinput'))
        .catch(err => {
            console.errror(err);
            return false;
        });
}

hasCamera().then(showSnap => showPage(showSnap ? 'snap' : 'gallery'));

AWS.config.update({
    region: 'eu-central-1',
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'eu-central-1:dde322a9-fc9b-4290-b627-6193ee4de47d',
    })
})

let s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {
        Bucket: BUCKET_NAME
    }
});

/**
 * Upload file from input event.
 * @param {Event} e 
 */
function onPhotoInputChange(e) {
    s3.upload({
        Key: `${ALBUM_KEY}${new Date().valueOf()}.jpg`,
        Body: e.target.files[0],
        ACL: 'public-read',
        Metadata: {
            poster: localStorage.getItem(STORAGE_NAME_KEY) || 'unknown'
        },
        CacheControl: 'max-age=172800'
    }, (err, data) => {
        if (err) {
            console.error(err)
        } else {
            console.info('Successfully uploaded photo.');
        }
    });
}

function getOwner(key) {
    return new Promise((resolve, reject) => s3.headObject({
        Key: key
    }, function (err, data) {
        if (err) reject(err);
        else resolve(data.Metadata.poster);
    }));
}

/**
 * @returns {Promise<String>}
 */
function getPhotoHtml(contents, bucketUrl) {
    const url = bucketUrl + encodeURIComponent(contents.Key);
    return getOwner(contents.Key)
        .then(owner => {
            return `
            <div class="col-md">
                <div class="polaroid">
                    <img src="${url}" class="img-fluid"/>
                    <p>${owner || 'unknown'}, ${contents.LastModified}</p>
                </div>
            </div>
        `
        });
}

function addRowBreak(htmls) {
    htmls.splice(3, 0, '<div class="w-100"></div>');
    return htmls;
}

/**
 * Adds the last 4 images from S3 to the photo container
 */
function showImages() {
    s3.listObjects({
        Prefix: ALBUM_KEY
    }, function (err, data) {
        if (err) {
            console.error(err);
            return;
        }
        // `this` references the AWS.Response instance that represents the response
        const href = this.request.httpRequest.endpoint.href;
        const bucketUrl = href + BUCKET_NAME + '/';

        Promise.all(
            data.Contents
                .filter(c => c.Size) // filter directories
                .sort((a, b) => b.LastModified.valueOf() - a.LastModified.valueOf())
                .slice(0, 6)
                .map(c => getPhotoHtml(c, bucketUrl))
        )
            .then(addRowBreak)
            .then(htmls => htmls.join(''))
            .then(html => document.getElementById('image-container').innerHTML = html);
    })
}

function isNameSet() {
    return !!localStorage.getItem(STORAGE_NAME_KEY);
}

document.getElementById('input-photo').addEventListener('change', onPhotoInputChange);