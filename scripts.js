// const PAGES = document.getElementsByClassName('page');

const STORAGE_NAME_KEY = 'mw-name';
const PAGES = ['snap', 'gallery'];
const UPDATE_INTERVAL = 1000 * 60; // 1 minute
const ALERT_FADE_INTERVAL = 1000 * 3; // 3 seconds

const ALBUM_KEY = 'photos/';
const BUCKET_NAME = 'memory-wall';

let updateHandle;
let hasCamera;

/**
 * Displays the indicated page and hides all other PAGES.
 * @param {'snap'|'gallery'} page 
 */
function showPage(page) {
    PAGES.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (p === page) {
            el.style.display = 'block';
            initPage(p);
        } else {
            el.style.display = 'none';
        }
    });
}

function setLoading(isLoading) {
    const el = document.getElementById('loader');
    el.style.display = isLoading ? 'block' : 'none';
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
    document.getElementById('btnBack').style.display = hasCamera ? 'block' : 'none';
}

function pad(n) {
    let s = String(n);
    return s.length === 1 ? '0' + s : s;
}

function formatDate(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}.${pad(date.getMonth())}.${date.getFullYear()}`;
}

/**
 * Checks if the device has a camera.
 * @returns {Promise<boolean>}
 */
function checkCamera() {
    if (typeof hasCamera !== 'undefined') {
        return Promise.resolve(hasCamera);
    }
    return navigator.mediaDevices.enumerateDevices()
        .then(devices => devices.some(d => d.kind === 'videoinput'))
        .then(c => {
            hasCamera = c;
            return c;
        })
        .catch(err => {
            console.errror(err);
            hasCamera = false;
            return false;
        });
}

checkCamera().then(showSnap => showPage(showSnap ? 'snap' : 'gallery'));

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
        ContentType: 'image/jpeg',
        Metadata: {
            poster: localStorage.getItem(STORAGE_NAME_KEY) || 'unknown'
        },
        CacheControl: 'max-age=172800'
    }, (err, data) => {
        if (err) {
            console.error(err);
            alertUser('error');
        } else {
            alertUser('success');
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

function getImageHtml(url) {
    return new Promise((resolve, reject) => {
        loadImage(url, resolve, { orientation: true, maxWidth: 600, maxHeight: 600 });
    })
}

function createElement(tag, clazz, textContent) {
    const node = document.createElement(tag);
    if (clazz) node.setAttribute('class', clazz);
    if (textContent) node.textContent = textContent;
    return node;
}

/**
 * @returns {Promise<String>}
 */
async function getPhotoHtml(contents, bucketUrl) {
    const url = bucketUrl + encodeURIComponent(contents.Key);
    const owner = await getOwner(contents.Key);
    const image = await getImageHtml(url);

    const node = createElement('div', 'col-md');
    node.appendChild(createElement('div', 'polaroid'));
    node.children[0].appendChild(image);
    node.children[0].appendChild(createElement('p', null, `${owner || 'unknown'}, ${formatDate(contents.LastModified)}`));
    return node;
}

function addRowBreak(nodes) {
    const breakNode = document.createElement('div');
    breakNode.setAttribute('class', 'w-100');
    nodes.splice(3, 0, breakNode);
    return nodes;
}

/**
 * Adds the last 4 images from S3 to the photo container
 */
function showImages() {
    setLoading(true);
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
            .then(nodes => {
                setLoading(false);
                const container = document.getElementById('image-container');
                while (container.hasChildNodes()) {
                    container.removeChild(container.lastChild);
                }
                nodes.forEach(n => container.appendChild(n));
            });
    })
}

function isNameSet() {
    return !!localStorage.getItem(STORAGE_NAME_KEY);
}

function alertUser(type) {
    const el = document.getElementById(`alert-${type}`);
    if (el) {
        el.style.display = 'block';
        setTimeout(() => el.removeAttribute('style'), ALERT_FADE_INTERVAL);
    }
}

function back() {
    showPage('snap');
}
